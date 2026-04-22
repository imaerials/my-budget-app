const BASE = '/api';

// Module-level token — set by AuthContext after login/refresh
let _accessToken = null;
let _onUnauthorized = null;

export function setAccessToken(token) { _accessToken = token; }
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

async function request(path, options = {}, _retry = false) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Token expired — try a silent refresh once
  if (res.status === 401 && !_retry) {
    const refreshed = await silentRefresh();
    if (refreshed) return request(path, options, true);
    _onUnauthorized?.();
    return;
  }

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function silentRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const { accessToken } = await res.json();
    setAccessToken(accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

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

  // Splits
  getSplitGroups: () => request('/splits'),
  createSplitGroup: (body) => request('/splits', { method: 'POST', body }),
  getSplitGroup: (id) => request(`/splits/${id}`),
  updateSplitGroup: (id, body) => request(`/splits/${id}`, { method: 'PUT', body }),
  deleteSplitGroup: (id) => request(`/splits/${id}`, { method: 'DELETE' }),

  addSplitMember: (groupId, body) => request(`/splits/${groupId}/members`, { method: 'POST', body }),
  removeSplitMember: (groupId, mid) => request(`/splits/${groupId}/members/${mid}`, { method: 'DELETE' }),

  addSplitExpense: (groupId, body) => request(`/splits/${groupId}/expenses`, { method: 'POST', body }),
  deleteSplitExpense: (groupId, eid) => request(`/splits/${groupId}/expenses/${eid}`, { method: 'DELETE' }),

  addSettlement: (groupId, body) => request(`/splits/${groupId}/settlements`, { method: 'POST', body }),
  deleteSettlement: (groupId, sid) => request(`/splits/${groupId}/settlements/${sid}`, { method: 'DELETE' }),

  // Reports
  getDashboard: () => request('/reports/dashboard'),
  getMonthlySummary: (params) => request('/reports/monthly' + toQuery(params)),
  getCategoryBreakdown: (params) => request('/reports/categories' + toQuery(params)),
  getTrend: (params) => request('/reports/trend' + toQuery(params)),
};

function toQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return q ? `?${q}` : '';
}
