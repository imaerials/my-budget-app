import { getDb } from '../db/schema.js';

export function listTransactions(req, res) {
  const db = getDb();
  const { account_id, category_id, type, month, year, limit = 100, offset = 0 } = req.query;
  const conditions = [];
  const params = [];

  if (account_id) { conditions.push('t.account_id = ?'); params.push(account_id); }
  if (category_id) { conditions.push('t.category_id = ?'); params.push(category_id); }
  if (type) { conditions.push('t.type = ?'); params.push(type); }
  if (month && year) {
    conditions.push("strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?");
    params.push(String(month).padStart(2, '0'), String(year));
  } else if (year) {
    conditions.push("strftime('%Y', t.date) = ?");
    params.push(String(year));
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `
    SELECT t.*,
      a.name AS account_name, a.color AS account_color,
      c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  const countQuery = `SELECT COUNT(*) AS total FROM transactions t ${where}`;
  const { total } = db.prepare(countQuery).get(...params.slice(0, -2));
  const rows = db.prepare(query).all(...params);

  res.json({ data: rows, total, limit: Number(limit), offset: Number(offset) });
}

export function getTransaction(req, res) {
  const db = getDb();
  const tx = db.prepare(`
    SELECT t.*,
      a.name AS account_name,
      c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
}

export function createTransaction(req, res) {
  const db = getDb();
  const { account_id, category_id, amount, type, description = '', date, notes = '' } = req.body;
  if (!account_id || !amount || !type || !date) {
    return res.status(400).json({ error: 'account_id, amount, type, and date are required' });
  }
  const result = db.prepare(`
    INSERT INTO transactions (account_id, category_id, amount, type, description, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(account_id, category_id || null, Math.abs(amount), type, description, date, notes);

  const tx = db.prepare(`
    SELECT t.*, a.name AS account_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(tx);
}

export function updateTransaction(req, res) {
  const db = getDb();
  const { account_id, category_id, amount, type, description, date, notes } = req.body;
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare(`
    UPDATE transactions SET
      account_id = COALESCE(?, account_id),
      category_id = COALESCE(?, category_id),
      amount = COALESCE(?, amount),
      type = COALESCE(?, type),
      description = COALESCE(?, description),
      date = COALESCE(?, date),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(account_id, category_id, amount ? Math.abs(amount) : null, type, description, date, notes, req.params.id);

  res.json(db.prepare(`
    SELECT t.*, a.name AS account_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(req.params.id));
}

export function deleteTransaction(req, res) {
  const db = getDb();
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.status(204).end();
}
