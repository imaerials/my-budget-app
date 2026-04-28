import pool from '../db/pool.js';

export async function listAccounts(req, res) {
  const { rows } = await pool.query(`
    SELECT a.*,
      a.balance + COALESCE((
        SELECT SUM(CASE WHEN t.type='income' THEN t.amount ELSE -t.amount END)
        FROM transactions t WHERE t.account_id = a.id
      ), 0) AS current_balance
    FROM accounts a WHERE a.user_id = $1 ORDER BY a.created_at
  `, [req.user.id]);
  res.json(rows);
}

export async function getAccount(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
  res.json(rows[0]);
}

export async function createAccount(req, res) {
  const { name, type, balance = 0, currency = 'USD', color = '#6366f1' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const { rows } = await pool.query(
    'INSERT INTO accounts (user_id, name, type, balance, currency, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, name, type, balance, currency, color]
  );
  res.status(201).json(rows[0]);
}

export async function updateAccount(req, res) {
  const { name, type, balance, currency, color } = req.body;
  const { rows } = await pool.query(`
    UPDATE accounts SET
      name     = COALESCE($1, name),
      type     = COALESCE($2, type),
      balance  = COALESCE($3, balance),
      currency = COALESCE($4, currency),
      color    = COALESCE($5, color)
    WHERE id = $6 AND user_id = $7 RETURNING *
  `, [name, type, balance, currency, color, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
  res.json(rows[0]);
}

export async function deleteAccount(req, res) {
  const { rows } = await pool.query(
    'DELETE FROM accounts WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
  res.status(204).end();
}
