import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { getDb } from '../db/schema.js';

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-in-production';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
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

export function register(req, res) {
  const db = getDb();
  const { name = '', email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const password_hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), email.toLowerCase(), password_hash);

  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, refreshToken, expiresAt);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
}

export function login(req, res) {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { password_hash, ...safeUser } = user;
  const accessToken = generateAccessToken(safeUser);
  const refreshToken = generateRefreshToken(safeUser);

  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, refreshToken, expiresAt);

  setRefreshCookie(res, refreshToken);
  res.json({ user: safeUser, accessToken });
}

export function refresh(req, res) {
  const db = getDb();
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  let payload;
  try {
    payload = jwt.verify(token, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const stored = db.prepare(
    "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')"
  ).get(token);

  if (!stored) {
    return res.status(401).json({ error: 'Refresh token revoked or expired' });
  }

  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate: delete old, issue new
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
  const newRefreshToken = generateRefreshToken(user);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, newRefreshToken, expiresAt);

  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken: generateAccessToken(user), user });
}

export function logout(req, res) {
  const db = getDb();
  const token = req.cookies?.refreshToken;
  if (token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
}

export function me(req, res) {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}
