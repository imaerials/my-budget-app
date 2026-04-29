import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';

if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set');
}

const ACCESS_SECRET  = process.env.ACCESS_TOKEN_SECRET;

const DEFAULT_CATEGORIES = [
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

async function seedDefaultCategories(userId) {
  for (const cat of DEFAULT_CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (user_id, name, type, color, icon) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [userId, cat.name, cat.type, cat.color, cat.icon]
    );
  }
}
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, jti: randomUUID() }, REFRESH_SECRET, { expiresIn: '7d' });
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_EXPIRES_MS,
    path: '/api/auth',
  });
}

export async function register(req, res) {
  const { name = '', email, password } = req.body;
  if (!email || !password)  return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing[0]) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = bcrypt.hashSync(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at',
    [name.trim(), email.toLowerCase(), password_hash]
  );
  const user = rows[0];

  await seedDefaultCategories(user.id);

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [user.id, refreshToken, new Date(Date.now() + REFRESH_EXPIRES_MS)]
  );
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password_hash, ...safeUser } = user;
  const accessToken  = generateAccessToken(safeUser);
  const refreshToken = generateRefreshToken(safeUser);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [user.id, refreshToken, new Date(Date.now() + REFRESH_EXPIRES_MS)]
  );
  setRefreshCookie(res, refreshToken);
  res.json({ user: safeUser, accessToken });
}

export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  let payload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  if (!rows[0]) return res.status(401).json({ error: 'Refresh token revoked or expired' });

  const { rows: users } = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [payload.id]
  );
  if (!users[0]) return res.status(401).json({ error: 'User not found' });
  const user = users[0];

  // Rotate: delete old, issue new
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  const newRefreshToken = generateRefreshToken(user);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)',
    [user.id, newRefreshToken, new Date(Date.now() + REFRESH_EXPIRES_MS)]
  );

  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken: generateAccessToken(user), user });
}

export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
}

export async function me(req, res) {
  const { rows } = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}

export async function updateProfile(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const { rows } = await pool.query(
    'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, created_at',
    [name.trim(), req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}
