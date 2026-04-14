import { getDb } from '../db/schema.js';

export function listBudgets(req, res) {
  const db = getDb();
  const { month, year } = req.query;
  const conditions = [];
  const params = [];
  if (month) { conditions.push('b.month = ?'); params.push(Number(month)); }
  if (year) { conditions.push('b.year = ?'); params.push(Number(year)); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const budgets = db.prepare(`
    SELECT b.*,
      c.name AS category_name, c.color AS category_color, c.icon AS category_icon, c.type AS category_type,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.category_id = b.category_id
          AND strftime('%m', t.date) = printf('%02d', b.month)
          AND strftime('%Y', t.date) = CAST(b.year AS TEXT)
          AND t.type = 'expense'
      ), 0) AS spent
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    ${where}
    ORDER BY c.name
  `).all(...params);
  res.json(budgets);
}

export function upsertBudget(req, res) {
  const db = getDb();
  const { category_id, amount, month, year } = req.body;
  if (!category_id || !amount || !month || !year) {
    return res.status(400).json({ error: 'category_id, amount, month, and year are required' });
  }
  const result = db.prepare(`
    INSERT INTO budgets (category_id, amount, month, year)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(category_id, month, year) DO UPDATE SET amount = excluded.amount
  `).run(category_id, amount, month, year);

  const budget = db.prepare(`
    SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM budgets b JOIN categories c ON c.id = b.category_id
    WHERE b.id = ?
  `).get(result.lastInsertRowid || db.prepare('SELECT id FROM budgets WHERE category_id=? AND month=? AND year=?').get(category_id, month, year).id);
  res.status(201).json(budget);
}

export function deleteBudget(req, res) {
  const db = getDb();
  const b = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Budget not found' });
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.status(204).end();
}
