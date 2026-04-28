import pool from '../db/pool.js';

const TX_SELECT = `
  SELECT t.*,
    a.name  AS account_name,  a.color AS account_color,
    c.name  AS category_name, c.color AS category_color, c.icon AS category_icon
  FROM transactions t
  LEFT JOIN accounts   a ON a.id = t.account_id
  LEFT JOIN categories c ON c.id = t.category_id
`;

export async function listTransactions(req, res) {
  const { account_id, category_id, type, month, year, limit = 100, offset = 0 } = req.query;

  const conditions = ['a.user_id = $1'];
  const params = [req.user.id];
  const add = (val) => { params.push(val); return `$${params.length}`; };

  if (account_id)  conditions.push(`t.account_id = ${add(account_id)}`);
  if (category_id) conditions.push(`t.category_id = ${add(category_id)}`);
  if (type)        conditions.push(`t.type = ${add(type)}`);
  if (month && year) {
    conditions.push(`TO_CHAR(t.date, 'MM') = ${add(String(month).padStart(2, '0'))}`);
    conditions.push(`TO_CHAR(t.date, 'YYYY') = ${add(String(year))}`);
  } else if (year) {
    conditions.push(`TO_CHAR(t.date, 'YYYY') = ${add(String(year))}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  params.push(Number(limit));
  params.push(Number(offset));

  const { rows } = await pool.query(
    `${TX_SELECT} ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ data: rows, total, limit: Number(limit), offset: Number(offset) });
}

export async function getTransaction(req, res) {
  const { rows } = await pool.query(
    `${TX_SELECT} WHERE t.id = $1 AND a.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
  res.json(rows[0]);
}

export async function createTransaction(req, res) {
  const { account_id, category_id, amount, type, description = '', date, notes = '' } = req.body;
  if (!account_id || !amount || !type || !date) {
    return res.status(400).json({ error: 'account_id, amount, type, and date are required' });
  }
  const { rows: acct } = await pool.query(
    'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
    [account_id, req.user.id]
  );
  if (!acct[0]) return res.status(404).json({ error: 'Account not found' });

  const { rows: ins } = await pool.query(
    `INSERT INTO transactions (account_id, category_id, amount, type, description, date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [account_id, category_id || null, Math.abs(amount), type, description, date, notes]
  );
  const { rows } = await pool.query(`${TX_SELECT} WHERE t.id = $1`, [ins[0].id]);
  res.status(201).json(rows[0]);
}

export async function updateTransaction(req, res) {
  const { account_id, category_id, amount, type, description, date, notes } = req.body;
  const { rows: existing } = await pool.query(
    'SELECT t.id FROM transactions t JOIN accounts a ON a.id = t.account_id WHERE t.id = $1 AND a.user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!existing[0]) return res.status(404).json({ error: 'Transaction not found' });

  if (account_id) {
    const { rows: acct } = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [account_id, req.user.id]
    );
    if (!acct[0]) return res.status(404).json({ error: 'Account not found' });
  }

  await pool.query(`
    UPDATE transactions SET
      account_id  = COALESCE($1, account_id),
      category_id = COALESCE($2, category_id),
      amount      = COALESCE($3, amount),
      type        = COALESCE($4, type),
      description = COALESCE($5, description),
      date        = COALESCE($6, date),
      notes       = COALESCE($7, notes)
    WHERE id = $8
  `, [account_id, category_id, amount ? Math.abs(amount) : null, type, description, date, notes, req.params.id]);
  const { rows } = await pool.query(`${TX_SELECT} WHERE t.id = $1`, [req.params.id]);
  res.json(rows[0]);
}

export async function deleteTransaction(req, res) {
  const { rows } = await pool.query(
    `DELETE FROM transactions WHERE id = $1
     AND account_id IN (SELECT id FROM accounts WHERE user_id = $2) RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
  res.status(204).end();
}
