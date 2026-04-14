# MyBudget App

A full-stack personal finance management web application. Track income and expenses, organize by categories, set monthly budgets, and visualize your finances through charts and reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Charts | Recharts 3 |
| Routing | React Router 7 |
| Backend | Node.js + Express 5 |
| Database | SQLite (better-sqlite3) |
| Icons | Lucide React |

---

## Features

- **Dashboard** — Monthly KPIs (balance, income, expenses, savings), annual bar chart, expense breakdown by category (pie chart), 30-day trend area chart, and recent transactions.
- **Transactions** — Full CRUD with filters by month/year/type and real-time search. Shows period totals.
- **Budgets** — Set spending limits per category for any given month. Progress bar with visual alert when the budget is exceeded.
- **Accounts** — Multiple accounts (checking, savings, cash, credit, investment) with balance calculated from transactions.
- **Categories** — Income and expense categories with customizable colors. Ships with 13 default categories.
- **Reports** — Annual comparison with monthly table, savings rate, best month of the year, and category breakdown split by income/expenses.

---

## Project Structure

```
my-budget-app/
├── package.json              # Root scripts (starts both servers)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js          # Express 5 server
│       ├── db/
│       │   ├── schema.js     # SQLite schema + initialization
│       │   └── seed.js       # Default categories + account
│       ├── routes/
│       │   └── index.js      # All REST routes
│       ├── controllers/
│       │   ├── accounts.js
│       │   ├── categories.js
│       │   ├── transactions.js
│       │   ├── budgets.js
│       │   └── reports.js
│       └── middleware/
│           └── errorHandler.js
└── frontend/
    ├── vite.config.js        # Proxy /api → localhost:3001
    └── src/
        ├── App.jsx
        ├── api/client.js     # Centralized fetch client
        ├── hooks/useApi.js   # Generic data-fetching hook
        ├── utils/format.js   # Currency, date, and number helpers
        ├── components/
        │   ├── layout/Navbar.jsx
        │   ├── ui/           # Button, Card, Modal, Input, Select, Badge, Spinner, EmptyState
        │   └── charts/       # MonthlyBarChart, CategoryPieChart, TrendLineChart
        └── pages/
            ├── Home.jsx          # Dashboard
            ├── Transactions.jsx
            ├── Budgets.jsx
            ├── Accounts.jsx
            ├── Categories.jsx
            └── Reports.jsx
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

The frontend proxies all `/api` requests to the backend, so there are no CORS issues in development.

### Available scripts

```bash
npm run dev        # Start backend + frontend simultaneously
npm run dev:api    # Backend only
npm run dev:ui     # Frontend only
npm run seed       # Seed the database with default categories
```

---

## REST API Reference

Base URL: `http://localhost:3001/api`

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

---

## Database

The `backend/budget.db` file is created automatically on first run. Schema:

```
accounts       — id, name, type, balance, currency, color
categories     — id, name, type, color, icon
transactions   — id, account_id, category_id, amount, type, description, date, notes
budgets        — id, category_id, amount, month, year  (unique per category + month + year)
```

SQLite runs in **WAL mode** with `foreign_keys = ON`.
