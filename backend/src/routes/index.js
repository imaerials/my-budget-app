import { Router } from 'express';
import * as accounts from '../controllers/accounts.js';
import * as categories from '../controllers/categories.js';
import * as transactions from '../controllers/transactions.js';
import * as budgets from '../controllers/budgets.js';
import * as reports from '../controllers/reports.js';

const router = Router();

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

export default router;
