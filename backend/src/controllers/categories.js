import pool from '../db/pool.js';

export async function listCategories(req, res) {
  const { type } = req.query;
  const { rows } = type
    ? await pool.query(
        'SELECT * FROM categories WHERE user_id = $1 AND type = $2 ORDER BY type, name',
        [req.user.id, type]
      )
    : await pool.query(
        'SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name',
        [req.user.id]
      );
  res.json(rows);
}

export async function getCategory(req, res) {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
  res.json(rows[0]);
}

export async function createCategory(req, res) {
  const { name, type, color = '#6366f1', icon = 'circle' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const { rows } = await pool.query(
    'INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.id, name, type, color, icon]
  );
  res.status(201).json(rows[0]);
}

export async function updateCategory(req, res) {
  const { name, type, color, icon } = req.body;
  const { rows } = await pool.query(`
    UPDATE categories SET
      name  = COALESCE($1, name),
      type  = COALESCE($2, type),
      color = COALESCE($3, color),
      icon  = COALESCE($4, icon)
    WHERE id = $5 AND user_id = $6 RETURNING *
  `, [name, type, color, icon, req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
  res.json(rows[0]);
}

export async function deleteCategory(req, res) {
  const { rows } = await pool.query(
    'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
  res.status(204).end();
}
