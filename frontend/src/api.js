const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('ledgerline_token');
export const setAuthToken = (token) => localStorage.setItem('ledgerline_token', token);
export const clearAuth = () => {
  localStorage.removeItem('ledgerline_token');
  localStorage.removeItem('ledgerline_user');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('ledgerline_user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user) => {
  localStorage.setItem('ledgerline_user', JSON.stringify(user));
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = (data && data.message) || data || `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.token);
    setStoredUser({
      userId: res.userId,
      email: res.email,
      role: res.role
    });
    return res;
  },

  getAccounts: () => request('/accounts'),

  getAccountById: (id) => request(`/accounts/${id}`),

  getStatement: (accountId) => request(`/accounts/${accountId}/statement`),

  getAggregateBalance: () => request('/accounts/aggregate'),

  createAccount: (data) => request('/accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  transfer: (data, idempotencyKey) => request('/transfers', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey || generateUUID()
    },
    body: JSON.stringify(data)
  }),

  withdraw: (data, idempotencyKey) => request('/withdrawals', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey || generateUUID()
    },
    body: JSON.stringify(data)
  }),

  deposit: (data, idempotencyKey) => request('/deposits', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey || generateUUID()
    },
    body: JSON.stringify(data)
  }),

  getAuditLogs: () => request('/audit-logs')
};
