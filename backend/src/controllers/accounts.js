import { getDb } from '../db/schema.js';

export function listAccounts(req, res) {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT a.*,
      COALESCE((
        SELECT SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END)
        FROM transactions t WHERE t.account_id = a.id
      ), 0) + a.balance AS current_balance
    FROM accounts a ORDER BY a.created_at
  `).all();
  res.json(accounts);
}

export function getAccount(req, res) {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
}

export function createAccount(req, res) {
  const db = getDb();
  const { name, type, balance = 0, currency = 'USD', color = '#6366f1' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const result = db.prepare(
    'INSERT INTO accounts (name, type, balance, currency, color) VALUES (?, ?, ?, ?, ?)'
  ).run(name, type, balance, currency, color);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(account);
}

export function updateAccount(req, res) {
  const db = getDb();
  const { name, type, balance, currency, color } = req.body;
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  db.prepare(`
    UPDATE accounts SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      balance = COALESCE(?, balance),
      currency = COALESCE(?, currency),
      color = COALESCE(?, color)
    WHERE id = ?
  `).run(name, type, balance, currency, color, req.params.id);
  res.json(db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id));
}

export function deleteAccount(req, res) {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.status(204).end();
}
