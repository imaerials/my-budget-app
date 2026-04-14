const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // Accounts
  getAccounts: () => request('/accounts'),
  createAccount: (body) => request('/accounts', { method: 'POST', body }),
  updateAccount: (id, body) => request(`/accounts/${id}`, { method: 'PUT', body }),
  deleteAccount: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: (params) => request('/categories' + toQuery(params)),
  createCategory: (body) => request('/categories', { method: 'POST', body }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params) => request('/transactions' + toQuery(params)),
  createTransaction: (body) => request('/transactions', { method: 'POST', body }),
  updateTransaction: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (params) => request('/budgets' + toQuery(params)),
  upsertBudget: (body) => request('/budgets', { method: 'POST', body }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Reports
  getDashboard: () => request('/reports/dashboard'),
  getMonthlySummary: (params) => request('/reports/monthly' + toQuery(params)),
  getCategoryBreakdown: (params) => request('/reports/categories' + toQuery(params)),
  getTrend: () => request('/reports/trend'),
};

function toQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return q ? `?${q}` : '';
}
