import pool from '../db/pool.js';

export async function monthlySummary(req, res) {
  const year = req.query.year || new Date().getFullYear();
  const { rows } = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM date)::INTEGER AS month,
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE TO_CHAR(date, 'YYYY') = $1
    GROUP BY month
    ORDER BY month
  `, [String(year)]);

  // Fill missing months with zeros
  const result = Array.from({ length: 12 }, (_, i) => {
    const m = rows.find((r) => r.month === i + 1);
    return { month: i + 1, income: m?.income || 0, expense: m?.expense || 0 };
  });
  res.json(result);
}

export async function categoryBreakdown(req, res) {
  const { type = 'expense', month, year = new Date().getFullYear() } = req.query;
  const params = [type, String(year)];
  const conditions = ['t.type = $1', "TO_CHAR(t.date, 'YYYY') = $2"];

  if (month) {
    params.push(String(month).padStart(2, '0'));
    conditions.push(`TO_CHAR(t.date, 'MM') = $${params.length}`);
  }

  const { rows } = await pool.query(`
    SELECT
      c.id    AS category_id,
      c.name  AS category_name,
      c.color AS category_color,
      c.icon  AS category_icon,
      SUM(t.amount) AS total
    FROM transactions t
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

  const [current, prev, balance, recent, topExp] = await Promise.all([
    pool.query(`
      SELECT
        SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE TO_CHAR(date, 'MM') = $1 AND TO_CHAR(date, 'YYYY') = $2
    `, [month, year]),

    pool.query(`
      SELECT
        SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
      FROM transactions
      WHERE TO_CHAR(date, 'MM') = $1 AND TO_CHAR(date, 'YYYY') = $2
    `, [prevMonth, prevYear]),

    pool.query(`
      SELECT COALESCE(SUM(a.balance), 0) +
        COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) FROM transactions), 0)
        AS total
      FROM accounts a
    `),

    pool.query(`
      SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN accounts   a ON a.id = t.account_id
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 5
    `),

    pool.query(`
      SELECT c.name AS category_name, c.color AS category_color, SUM(t.amount) AS total
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.type = 'expense'
        AND TO_CHAR(t.date, 'MM') = $1
        AND TO_CHAR(t.date, 'YYYY') = $2
      GROUP BY t.category_id, c.name, c.color
      ORDER BY total DESC
      LIMIT 5
    `, [month, year]),
  ]);

  const cm = current.rows[0];
  const pm = prev.rows[0];

  res.json({
    totalBalance: balance.rows[0].total,
    currentMonth: {
      income:  cm.income  || 0,
      expense: cm.expense || 0,
      savings: (cm.income || 0) - (cm.expense || 0),
    },
    prevMonth: {
      income:  pm.income  || 0,
      expense: pm.expense || 0,
    },
    recentTransactions: recent.rows,
    topExpenses: topExp.rows,
  });
}

export async function last30DaysTrend(req, res) {
  const { rows } = await pool.query(`
    SELECT
      date::text,
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date
    ORDER BY date
  `);
  res.json(rows);
}
