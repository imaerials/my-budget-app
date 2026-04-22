import pool from '../db/pool.js';

export async function monthlySummary(req, res) {
  const year = req.query.year || new Date().getFullYear();
  const { currency } = req.query;
  const params = [String(year)];
  const where = ["TO_CHAR(t.date, 'YYYY') = $1"];

  if (currency) {
    params.push(currency);
    where.push(`a.currency = $${params.length}`);
  }

  const { rows } = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM t.date)::INTEGER AS month,
      SUM(CASE WHEN t.type='income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) AS expense
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE ${where.join(' AND ')}
    GROUP BY month
    ORDER BY month
  `, params);

  const result = Array.from({ length: 12 }, (_, i) => {
    const m = rows.find((r) => r.month === i + 1);
    return { month: i + 1, income: m?.income || 0, expense: m?.expense || 0 };
  });
  res.json(result);
}

export async function categoryBreakdown(req, res) {
  const { type = 'expense', month, year = new Date().getFullYear(), currency } = req.query;
  const params = [type, String(year)];
  const conditions = ['t.type = $1', "TO_CHAR(t.date, 'YYYY') = $2"];

  if (month) {
    params.push(String(month).padStart(2, '0'));
    conditions.push(`TO_CHAR(t.date, 'MM') = $${params.length}`);
  }
  if (currency) {
    params.push(currency);
    conditions.push(`a.currency = $${params.length}`);
  }

  const { rows } = await pool.query(`
    SELECT
      c.id    AS category_id,
      c.name  AS category_name,
      c.color AS category_color,
      c.icon  AS category_icon,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY c.id, c.name, c.color, c.icon
    ORDER BY total DESC
  `, params);
  res.json(rows);
}

export async function dashboardStats(req, res) {
  const now = new Date();
  const month     = String(now.getMonth() + 1).padStart(2, '0');
  const year      = String(now.getFullYear());
  const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
  const prevYear  = String(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const [current, prev, balances, recent, topExp] = await Promise.all([
    pool.query(`
      SELECT a.currency,
        SUM(CASE WHEN t.type='income'  THEN t.amount ELSE 0 END) AS income,
        SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) AS expense
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE TO_CHAR(t.date, 'MM') = $1 AND TO_CHAR(t.date, 'YYYY') = $2
      GROUP BY a.currency
    `, [month, year]),

    pool.query(`
      SELECT a.currency,
        SUM(CASE WHEN t.type='income'  THEN t.amount ELSE 0 END) AS income,
        SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) AS expense
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      WHERE TO_CHAR(t.date, 'MM') = $1 AND TO_CHAR(t.date, 'YYYY') = $2
      GROUP BY a.currency
    `, [prevMonth, prevYear]),

    // Current balance per currency: sum of account initial balance + all-time tx net
    pool.query(`
      SELECT a.currency,
        SUM(
          a.balance + COALESCE((
            SELECT SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END)
            FROM transactions t WHERE t.account_id = a.id
          ), 0)
        ) AS total
      FROM accounts a
      GROUP BY a.currency
    `),

    pool.query(`
      SELECT t.*, c.name AS category_name, c.color AS category_color, a.name AS account_name, a.currency
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 5
    `),

    pool.query(`
      SELECT c.name AS category_name, c.color AS category_color, a.currency, SUM(t.amount) AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN accounts a ON a.id = t.account_id
      WHERE t.type = 'expense'
        AND TO_CHAR(t.date, 'MM') = $1
        AND TO_CHAR(t.date, 'YYYY') = $2
      GROUP BY t.category_id, c.name, c.color, a.currency
      ORDER BY total DESC
    `, [month, year]),
  ]);

  const cmMap  = Object.fromEntries(current.rows.map((r) => [r.currency, r]));
  const pmMap  = Object.fromEntries(prev.rows.map((r) => [r.currency, r]));
  const balMap = Object.fromEntries(balances.rows.map((r) => [r.currency, r.total]));

  const currencies = [...new Set([...Object.keys(balMap), ...Object.keys(cmMap)])].sort();

  const byCurrency = {};
  for (const cur of currencies) {
    const cm = cmMap[cur] || { income: 0, expense: 0 };
    const pm = pmMap[cur] || { income: 0, expense: 0 };
    byCurrency[cur] = {
      balance:      balMap[cur] || 0,
      currentMonth: { income: cm.income || 0, expense: cm.expense || 0, savings: (cm.income || 0) - (cm.expense || 0) },
      prevMonth:    { income: pm.income || 0, expense: pm.expense || 0 },
    };
  }

  res.json({
    currencies,
    byCurrency,
    recentTransactions: recent.rows,
    topExpenses: topExp.rows,
  });
}

export async function last30DaysTrend(req, res) {
  const { currency } = req.query;
  const params = [];
  const where  = ["t.date >= CURRENT_DATE - INTERVAL '30 days'"];

  if (currency) {
    params.push(currency);
    where.push(`a.currency = $${params.length}`);
  }

  const { rows } = await pool.query(`
    SELECT
      t.date::text,
      SUM(CASE WHEN t.type='income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) AS expense
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE ${where.join(' AND ')}
    GROUP BY t.date
    ORDER BY t.date
  `, params);
  res.json(rows);
}
