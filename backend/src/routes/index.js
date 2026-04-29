import { Router } from 'express';
import * as accounts from '../controllers/accounts.js';
import * as categories from '../controllers/categories.js';
import * as transactions from '../controllers/transactions.js';
import * as budgets from '../controllers/budgets.js';
import * as reports from '../controllers/reports.js';
import * as auth from '../controllers/auth.js';
import * as splits from '../controllers/splits.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(apiLimiter);

// ── Public auth routes ────────────────────────────────────────────────────────
router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.post('/auth/refresh', authLimiter, auth.refresh);
router.post('/auth/logout', auth.logout);

// ── All routes below require a valid access token ────────────────────────────
router.use(authenticateToken);

// Current user
router.get('/auth/me', auth.me);

// Profile
router.put('/profile', auth.updateProfile);

// Accounts
router.get('/accounts', accounts.listAccounts);
router.get('/accounts/:id', accounts.getAccount);
router.post('/accounts', accounts.createAccount);
router.put('/accounts/:id', accounts.updateAccount);
router.delete('/accounts/:id', accounts.deleteAccount);

// Categories
router.get('/categories', categories.listCategories);
router.get('/categories/:id', categories.getCategory);
router.post('/categories', categories.createCategory);
router.put('/categories/:id', categories.updateCategory);
router.delete('/categories/:id', categories.deleteCategory);

// Transactions
router.get('/transactions', transactions.listTransactions);
router.get('/transactions/:id', transactions.getTransaction);
router.post('/transactions', transactions.createTransaction);
router.put('/transactions/:id', transactions.updateTransaction);
router.delete('/transactions/:id', transactions.deleteTransaction);

// Budgets
router.get('/budgets', budgets.listBudgets);
router.post('/budgets', budgets.upsertBudget);
router.delete('/budgets/:id', budgets.deleteBudget);

// Reports
router.get('/reports/dashboard', reports.dashboardStats);
router.get('/reports/monthly', reports.monthlySummary);
router.get('/reports/categories', reports.categoryBreakdown);
router.get('/reports/trend', reports.last30DaysTrend);

// ── Tools: Expense Splitter ──────────────────────────────────────────────────
router.get('/splits', splits.listGroups);
router.post('/splits', splits.createGroup);
router.get('/splits/:id', splits.getGroup);
router.put('/splits/:id', splits.updateGroup);
router.delete('/splits/:id', splits.deleteGroup);

router.post('/splits/:id/members', splits.addMember);
router.delete('/splits/:id/members/:mid', splits.removeMember);

router.post('/splits/:id/expenses', splits.addExpense);
router.delete('/splits/:id/expenses/:eid', splits.deleteExpense);

router.post('/splits/:id/settlements', splits.addSettlement);
router.delete('/splits/:id/settlements/:sid', splits.deleteSettlement);

export default router;
