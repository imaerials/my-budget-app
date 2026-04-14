# MyBudget App

A full-stack and easy personal finance management web application. Track income and expenses, organize by categories, set monthly budgets, visualize your finances through charts and reports, and split bills with friends.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Charts | Recharts 3 |
| Routing | React Router 7 |
| Backend | Node.js + Express 5 |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (access + refresh tokens) + bcryptjs |
| Icons | Lucide React |

---

## Features

- **Authentication** — Secure sign up / sign in with JWT. Short-lived access tokens (15 min) kept in memory; refresh tokens (7 days) in an `httpOnly` cookie with automatic rotation.
- **Dashboard** — Monthly KPIs (balance, income, expenses, savings), annual bar chart, expense breakdown by category (pie chart), 30-day trend area chart, and recent transactions.
- **Transactions** — Full CRUD with filters by month/year/type and real-time search. Shows period totals.
- **Budgets** — Set spending limits per category for any given month. Progress bar with visual alert when the budget is exceeded.
- **Accounts** — Multiple accounts (checking, savings, cash, credit, investment) with balance calculated from transactions.
- **Categories** — Income and expense categories with customizable colors. Ships with 13 default categories.
- **Reports** — Annual comparison with monthly table, savings rate, best month of the year, and category breakdown split by income/expenses.
- **Tools: Expense Splitter** — Split bills among friends, trips, or flatmates. Tracks who paid what, calculates net balances, and suggests the minimum number of payments to settle all debts.

---

## Project Structure

```
my-budget-app/
├── package.json                    # Root scripts (starts both servers)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js                # Express 5 server
│       ├── db/
│       │   ├── schema.js           # SQLite schema + initialization
│       │   └── seed.js             # Default categories + account
│       ├── routes/
│       │   └── index.js            # All REST routes
│       ├── controllers/
│       │   ├── auth.js             # register, login, refresh, logout, me
│       │   ├── accounts.js
│       │   ├── categories.js
│       │   ├── transactions.js
│       │   ├── budgets.js
│       │   ├── reports.js
│       │   └── splits.js           # Expense splitter logic + debt simplification
│       └── middleware/
│           ├── auth.js             # authenticateToken (JWT guard)
│           └── errorHandler.js
└── frontend/
    ├── vite.config.js              # Proxy /api → localhost:3001
    └── src/
        ├── App.jsx                 # AuthProvider + ProtectedRoute + routing
        ├── api/client.js           # Fetch client with Bearer token + silent refresh
        ├── contexts/
        │   └── AuthContext.jsx     # Global auth state, session restore on load
        ├── hooks/useApi.js         # Generic data-fetching hook
        ├── utils/format.js         # Currency, date, and number helpers
        ├── components/
        │   ├── layout/Navbar.jsx   # Nav links + logged-in user + sign out
        │   ├── ui/                 # Button, Card, Modal, Input, Select, Badge, Spinner, EmptyState
        │   └── charts/             # MonthlyBarChart, CategoryPieChart, TrendLineChart
        └── pages/
            ├── Login.jsx           # Sign in / Sign up (tab switcher)
            ├── Home.jsx            # Dashboard
            ├── Transactions.jsx
            ├── Budgets.jsx
            ├── Accounts.jsx
            ├── Categories.jsx
            ├── Reports.jsx
            ├── Tools.jsx           # Tool launcher (extensible)
            └── tools/
                ├── Splitter.jsx        # Group list + create group
                └── SplitGroupDetail.jsx # Expenses · Balances · Settlements · Members
```

---

## Getting Started

### Requirements

- Node.js 18 or higher
- npm 9 or higher

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd my-budget-app

# Root dependencies (concurrently)
npm install

# Backend dependencies
npm install --prefix backend

# Frontend dependencies
npm install --prefix frontend
```

### 2. Seed the database (default categories + account)

```bash
npm run seed
```

### 3. Start in development mode

```bash
npm run dev
```

This starts both servers in parallel:

| Service | URL |
|---------|-----|
| REST API | http://localhost:3001 |
| Frontend | http://localhost:5173 |

Open `http://localhost:5173`, create an account on the sign-up screen, and you're in.

### Available scripts

```bash
npm run dev        # Start backend + frontend simultaneously
npm run dev:api    # Backend only
npm run dev:ui     # Frontend only
npm run seed       # Seed the database with default categories
```

### Environment variables (optional)

By default the app runs with built-in development secrets. For production, set these in a `.env` file inside `backend/`:

```env
ACCESS_TOKEN_SECRET=your-strong-random-secret
REFRESH_TOKEN_SECRET=another-strong-random-secret
PORT=3001
NODE_ENV=production
```

---

## REST API Reference

Base URL: `http://localhost:3001/api`

### Authentication

All routes except `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/logout` require a valid access token:

```
Authorization: Bearer <accessToken>
```

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Create a new account |
| POST | `/auth/login` | Public | Sign in, returns access token + sets refresh cookie |
| POST | `/auth/refresh` | Cookie | Rotate refresh token, return new access token |
| POST | `/auth/logout` | Cookie | Revoke refresh token, clear cookie |
| GET | `/auth/me` | Bearer | Return current user info |

### Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/accounts` | List all accounts |
| POST | `/accounts` | Create account |
| PUT | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Delete account (cascades transactions) |

### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories?type=expense\|income` | List categories |
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/transactions?month=&year=&type=&limit=&offset=` | List with filters and pagination |
| POST | `/transactions` | Create transaction |
| PUT | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |

### Budgets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/budgets?month=&year=` | List budgets (includes actual spending) |
| POST | `/budgets` | Create or update budget (upsert) |
| DELETE | `/budgets/:id` | Delete budget |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/reports/dashboard` | Current month KPIs + recent transactions |
| GET | `/reports/monthly?year=` | Income and expenses per month |
| GET | `/reports/categories?type=&month=&year=` | Totals grouped by category |
| GET | `/reports/trend` | Daily movements for the last 30 days |

### Expense Splitter
| Method | Path | Description |
|--------|------|-------------|
| GET | `/splits` | List all groups |
| POST | `/splits` | Create group |
| GET | `/splits/:id` | Group detail with members, expenses, balances, and settlement suggestions |
| PUT | `/splits/:id` | Update group |
| DELETE | `/splits/:id` | Delete group (cascades everything) |
| POST | `/splits/:id/members` | Add member to group |
| DELETE | `/splits/:id/members/:mid` | Remove member (blocked if they have paid expenses) |
| POST | `/splits/:id/expenses` | Add expense — equal or custom split |
| DELETE | `/splits/:id/expenses/:eid` | Delete expense |
| POST | `/splits/:id/settlements` | Record a payment between members |
| DELETE | `/splits/:id/settlements/:sid` | Delete a settlement |

---

## Database

The `backend/budget.db` file is created automatically on first run. Schema:

```
users              — id, name, email, password_hash, created_at
refresh_tokens     — id, user_id, token, expires_at, created_at
accounts           — id, name, type, balance, currency, color
categories         — id, name, type, color, icon
transactions       — id, account_id, category_id, amount, type, description, date, notes
budgets            — id, category_id, amount, month, year  (unique per category + month + year)
split_groups       — id, name, description, currency, created_at
split_members      — id, group_id, name, created_at
split_expenses     — id, group_id, paid_by, description, amount, date, created_at
split_shares       — id, expense_id, member_id, amount  (unique per expense + member)
split_settlements  — id, group_id, from_member_id, to_member_id, amount, date, note
```

SQLite runs in **WAL mode** with `foreign_keys = ON`.

---

## Expense Splitter — How it works

```
1. Create a group (e.g. "Barcelona Trip") with a list of members

2. Add expenses — who paid and how to split:
   - Equally among all members
   - Custom amount per member

3. The app calculates each person's net balance:
   net = total paid − total owed across all expenses

4. Debt simplification algorithm finds the minimum number
   of payments to settle all balances:

   Example — 3 people, 2 expenses:
   Alice paid $120 (Hotel, split 3 ways) → net +$60
   Bob   paid $60  (Dinner, split 3 ways) → net  $0
   Carol paid $0                          → net -$60

   Suggestion: Carol → Alice $60  (1 payment settles everything)

5. Record payments as settlements to mark debts as paid
```

---

## Auth flow

```
Sign up / Sign in
      │
      ▼
POST /auth/login  ──► accessToken (15 min)  →  stored in React memory
                  ──► refreshToken (7 days) →  httpOnly cookie (path: /api/auth)
                                                + persisted in DB
      │
      │  Every API call
      ▼
Authorization: Bearer <accessToken>
      │
      │  On 401 (expired)
      ▼
POST /auth/refresh  ──► new accessToken  (old refresh token deleted, new one issued)
      │
      │  On logout
      ▼
POST /auth/logout  ──► refresh token deleted from DB, cookie cleared
```
