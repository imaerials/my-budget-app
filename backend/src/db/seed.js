// Dev seed: creates a test user and populates default categories + one account.
// Run with: node src/db/seed.js
import bcrypt from 'bcryptjs';
import { initSchema, runMigrations } from './schema.js';
import pool from './pool.js';

await initSchema();
await runMigrations();

const email = 'demo@example.com';
const password_hash = bcrypt.hashSync('password123', 12);

const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
let userId;
if (existing[0]) {
  userId = existing[0].id;
  console.log(`Using existing user: ${email} (id=${userId})`);
} else {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id`,
    ['Demo User', email, password_hash]
  );
  userId = rows[0].id;
  console.log(`Created user: ${email} (id=${userId}), password: password123`);
}

const categories = [
  { name: 'Alimentación',    type: 'expense', color: '#f97316', icon: 'utensils' },
  { name: 'Transporte',      type: 'expense', color: '#3b82f6', icon: 'car' },
  { name: 'Vivienda',        type: 'expense', color: '#8b5cf6', icon: 'home' },
  { name: 'Salud',           type: 'expense', color: '#ef4444', icon: 'heart' },
  { name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'film' },
  { name: 'Educación',       type: 'expense', color: '#06b6d4', icon: 'book' },
  { name: 'Ropa',            type: 'expense', color: '#f59e0b', icon: 'shirt' },
  { name: 'Servicios',       type: 'expense', color: '#64748b', icon: 'zap' },
  { name: 'Otros gastos',    type: 'expense', color: '#94a3b8', icon: 'more-horizontal' },
  { name: 'Salario',         type: 'income',  color: '#22c55e', icon: 'briefcase' },
  { name: 'Freelance',       type: 'income',  color: '#10b981', icon: 'laptop' },
  { name: 'Inversiones',     type: 'income',  color: '#84cc16', icon: 'trending-up' },
  { name: 'Otros ingresos',  type: 'income',  color: '#a3e635', icon: 'plus-circle' },
];

for (const cat of categories) {
  await pool.query(
    `INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [userId, cat.name, cat.type, cat.color, cat.icon]
  );
}

const { rows: accts } = await pool.query('SELECT id FROM accounts WHERE user_id = $1 LIMIT 1', [userId]);
if (!accts[0]) {
  await pool.query(
    `INSERT INTO accounts (user_id, name, type, balance, currency, color) VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, 'Cuenta Principal', 'checking', 0, 'USD', '#6366f1']
  );
}

console.log('Seed completed successfully.');
await pool.end();
