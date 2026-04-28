import pool from './pool.js';

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL DEFAULT '',
      email     TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('checking','savings','cash','credit','investment')),
      balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
      currency   TEXT NOT NULL DEFAULT 'USD',
      color      TEXT NOT NULL DEFAULT '#6366f1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('income','expense')),
      color      TEXT NOT NULL DEFAULT '#6366f1',
      icon       TEXT NOT NULL DEFAULT 'circle',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id          SERIAL PRIMARY KEY,
      account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      amount      NUMERIC(15,2) NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income','expense','transfer')),
      description TEXT NOT NULL DEFAULT '',
      date        DATE NOT NULL,
      notes       TEXT DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      amount      NUMERIC(15,2) NOT NULL,
      month       INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year        INTEGER NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, category_id, month, year)
    );

    CREATE TABLE IF NOT EXISTS split_groups (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      currency    TEXT NOT NULL DEFAULT 'USD',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS split_members (
      id         SERIAL PRIMARY KEY,
      group_id   INTEGER NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS split_expenses (
      id          SERIAL PRIMARY KEY,
      group_id    INTEGER NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
      paid_by     INTEGER NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount      NUMERIC(15,2) NOT NULL,
      date        DATE NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS split_shares (
      id         SERIAL PRIMARY KEY,
      expense_id INTEGER NOT NULL REFERENCES split_expenses(id) ON DELETE CASCADE,
      member_id  INTEGER NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
      amount     NUMERIC(15,2) NOT NULL,
      UNIQUE(expense_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS split_settlements (
      id             SERIAL PRIMARY KEY,
      group_id       INTEGER NOT NULL REFERENCES split_groups(id) ON DELETE CASCADE,
      from_member_id INTEGER NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
      to_member_id   INTEGER NOT NULL REFERENCES split_members(id) ON DELETE CASCADE,
      amount         NUMERIC(15,2) NOT NULL,
      date           DATE NOT NULL,
      note           TEXT NOT NULL DEFAULT '',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_account  ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month_year    ON budgets(month, year);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token  ON refresh_tokens(token);
  `);
}

// Adds user_id columns to tables that predate this migration.
// Safe to run on both fresh and existing databases.
export async function runMigrations() {
  const alterations = [
    `ALTER TABLE accounts     ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
    `ALTER TABLE categories   ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
    `ALTER TABLE budgets      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
    `ALTER TABLE split_groups ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
    `CREATE INDEX IF NOT EXISTS idx_accounts_user     ON accounts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_user   ON categories(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_user      ON budgets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_split_groups_user ON split_groups(user_id)`,
  ];

  for (const sql of alterations) {
    await pool.query(sql);
  }

  // Replace old single-column unique constraint with one that includes user_id
  await pool.query(`ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_month_year_key`);
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_constraint WHERE conname = 'budgets_user_id_category_id_month_year_key'`
  );
  if (!rows.length) {
    await pool.query(
      `ALTER TABLE budgets ADD CONSTRAINT budgets_user_id_category_id_month_year_key UNIQUE (user_id, category_id, month, year)`
    );
  }
}
