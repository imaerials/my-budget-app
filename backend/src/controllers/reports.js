import { getDb } from '../db/schema.js';

export function monthlySummary(req, res) {
  const db = getDb();
  const { year = new Date().getFullYear() } = req.query;

  const monthly = db.prepare(`
    SELECT
      CAST(strftime('%m', date) AS INTEGER) AS month,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%Y', date) = ?
    GROUP BY month
    ORDER BY month
  `).all(String(year));

  // Fill missing months
  const result = Array.from({ length: 12 }, (_, i) => {
    const m = monthly.find(r => r.month === i + 1);
    return { month: i + 1, income: m?.income || 0, expense: m?.expense || 0 };
  });

  res.json(result);
}

export function categoryBreakdown(req, res) {
  const db = getDb();
  const { month, year = new Date().getFullYear(), type = 'expense' } = req.query;

  const conditions = ["t.type = ?", "strftime('%Y', t.date) = ?"];
  const params = [type, String(year)];

  if (month) {
    conditions.push("strftime('%m', t.date) = ?");
    params.push(String(month).padStart(2, '0'));
  }

  const rows = db.prepare(`
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.color AS category_color,
      c.icon AS category_icon,
      SUM(t.amount) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY t.category_id
    ORDER BY total DESC
  `).all(...params);

  res.json(rows);
}

export function dashboardStats(req, res) {
  const db = getDb();
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const prevMonth = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
  const prevYear = String(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const currentPeriod = db.prepare(`
    SELECT
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
  `).get(month, year);

  const prevPeriod = db.prepare(`
    SELECT
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
  `).get(prevMonth, prevYear);

  const totalBalance = db.prepare(`
    SELECT COALESCE(SUM(a.balance), 0) +
      COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) FROM transactions), 0) AS total
    FROM accounts a
  `).get();

  const recentTransactions = db.prepare(`
    SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon, a.name AS account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN accounts a ON a.id = t.account_id
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 5
  `).all();

  const topExpenses = db.prepare(`
    SELECT c.name AS category_name, c.color AS category_color, SUM(t.amount) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND strftime('%m', t.date) = ?
      AND strftime('%Y', t.date) = ?
    GROUP BY t.category_id
    ORDER BY total DESC
    LIMIT 5
  `).all(month, year);

  res.json({
    totalBalance: totalBalance.total,
    currentMonth: {
      income: currentPeriod.income || 0,
      expense: currentPeriod.expense || 0,
      savings: (currentPeriod.income || 0) - (currentPeriod.expense || 0),
    },
    prevMonth: {
      income: prevPeriod.income || 0,
      expense: prevPeriod.expense || 0,
    },
    recentTransactions,
    topExpenses,
  });
}

export function last30DaysTrend(req, res) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      date,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
    FROM transactions
    WHERE date >= date('now', '-30 days')
    GROUP BY date
    ORDER BY date
  `).all();
  res.json(rows);
}
