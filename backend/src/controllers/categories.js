import { getDb } from '../db/schema.js';

export function listCategories(req, res) {
  const db = getDb();
  const { type } = req.query;
  let query = 'SELECT * FROM categories';
  const params = [];
  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }
  query += ' ORDER BY type, name';
  res.json(db.prepare(query).all(...params));
}

export function getCategory(req, res) {
  const db = getDb();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  res.json(cat);
}

export function createCategory(req, res) {
  const db = getDb();
  const { name, type, color = '#6366f1', icon = 'circle' } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
  const result = db.prepare(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)'
  ).run(name, type, color, icon);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
}

export function updateCategory(req, res) {
  const db = getDb();
  const { name, type, color, icon } = req.body;
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  db.prepare(`
    UPDATE categories SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      color = COALESCE(?, color),
      icon = COALESCE(?, icon)
    WHERE id = ?
  `).run(name, type, color, icon, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
}

export function deleteCategory(req, res) {
  const db = getDb();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).end();
}
