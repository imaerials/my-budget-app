import pool from '../db/pool.js';

export async function listBudgets(req, res) {
  const { month, year } = req.query;
  const conditions = [];
  const params = [];
  const add = (v) => { params.push(v); return `$${params.length}`; };

  if (month) conditions.push(`b.month = ${add(Number(month))}`);
  if (year)  conditions.push(`b.year = ${add(Number(year))}`);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await pool.query(`
    SELECT b.*,
      c.name  AS category_name,
      c.color AS category_color,
      c.icon  AS category_icon,
      c.type  AS category_type,
      COALESCE((
        SELECT SUM(t.amount)
        FROM transactions t
        WHERE t.category_id = b.category_id
          AND TO_CHAR(t.date, 'MM') = LPAD(b.month::text, 2, '0')
          AND TO_CHAR(t.date, 'YYYY') = b.year::text
          AND t.type = 'expense'
      ), 0) AS spent
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    ${where}
    ORDER BY c.name
  `, params);
  res.json(rows);
}

export async function upsertBudget(req, res) {
  const { category_id, amount, month, year } = req.body;
  if (!category_id || !amount || !month || !year) {
    return res.status(400).json({ error: 'category_id, amount, month, and year are required' });
  }
  const { rows } = await pool.query(`
    INSERT INTO budgets (category_id, amount, month, year)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (category_id, month, year) DO UPDATE SET amount = EXCLUDED.amount
    RETURNING id
  `, [category_id, amount, month, year]);

  const { rows: result } = await pool.query(`
    SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
    FROM budgets b JOIN categories c ON c.id = b.category_id
    WHERE b.id = $1
  `, [rows[0].id]);
  res.status(201).json(result[0]);
}

export async function deleteBudget(req, res) {
  const { rows } = await pool.query('DELETE FROM budgets WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Budget not found' });
  res.status(204).end();
}
