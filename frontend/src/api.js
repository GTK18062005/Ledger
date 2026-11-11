// In production/cloud deployment, reads from VITE_API_URL (e.g. https://balancevault-backend.onrender.com)
// In local development, falls back to relative '/api' which Vite proxies to http://localhost:8080
const RAW_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';
const API_BASE = `${RAW_BASE}/api`;

export const getAuthToken = () => localStorage.getItem('balancevault_token') || localStorage.getItem('ledgerline_token');
export const setAuthToken = (token) => {
  localStorage.setItem('balancevault_token', token);
  localStorage.setItem('ledgerline_token', token);
};

export const clearAuth = () => {
  localStorage.removeItem('balancevault_token');
  localStorage.removeItem('ledgerline_token');
  localStorage.removeItem('balancevault_user');
  localStorage.removeItem('ledgerline_user');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('balancevault_user') || localStorage.getItem('ledgerline_user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user) => {
  localStorage.setItem('balancevault_user', JSON.stringify(user));
  localStorage.setItem('ledgerline_user', JSON.stringify(user));
};

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Rate limit listeners
let rateLimitListeners = [];
export const onRateLimitUpdate = (listener) => {
  rateLimitListeners.push(listener);
  return () => {
    rateLimitListeners = rateLimitListeners.filter(l => l !== listener);
  };
};

const notifyRateLimit = (info) => {
  rateLimitListeners.forEach(l => {
    try { l(info); } catch (e) { /* ignore */ }
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

  // Extract rate limiting telemetry headers
  const rateLimitLimit = response.headers.get('x-ratelimit-limit');
  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitCategory = response.headers.get('x-ratelimit-category');
  const retryAfter = response.headers.get('retry-after');

  if (rateLimitLimit !== null || rateLimitRemaining !== null) {
    notifyRateLimit({
      limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
      remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
      category: rateLimitCategory || 'GENERAL',
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
      status: response.status
    });
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = (data && data.message) || (data && data.error) || data || `HTTP ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    error.retryAfter = retryAfter;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication & Onboarding
  login: async (email, password) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.token);
    setStoredUser({
      userId: res.userId,
      email: res.email,
      role: res.role,
      fullName: res.fullName || (res.email.includes('tharun') ? 'Tharun Kumar Gangavarapu' : res.email.split('@')[0]),
      primaryAccountId: res.primaryAccountId,
      primaryAccountNumber: res.primaryAccountNumber
    });
    return res;
  },

  register: async (data) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) {
      setAuthToken(res.token);
      setStoredUser({
        userId: res.userId,
        email: res.email,
        role: res.role,
        fullName: res.fullName || data.fullName || 'Account holder',
        primaryAccountId: res.primaryAccountId,
        primaryAccountNumber: res.primaryAccountNumber
      });
    }
    return res;
  },

  getProfile: () => request('/auth/profile'),

  updateProfile: (data) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  changePassword: (data) => request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  bootstrapAdmin: (data) => request('/admin/bootstrap', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Accounts
  getAccounts: () => request('/accounts'),

  getAccountById: (id) => request(`/accounts/${id}`),

  openSecondaryAccount: (currency) => request('/accounts/open', {
    method: 'POST',
    body: JSON.stringify({ currency })
  }),

  createAccount: (data) => request('/accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateAccountStatus: (accountId, status, adminReason) => request(`/accounts/${accountId}/status`, {
    method: 'POST',
    body: JSON.stringify({
      status,
      adminReason: (adminReason && adminReason.trim()) ? adminReason.trim() : 'Administrative status update'
    })
  }),

  getStatement: (accountId, page, size) => {
    let url = `/accounts/${accountId}/statement`;
    if (page !== undefined && size !== undefined) {
      url += `?page=${page}&size=${size}`;
    }
    return request(url);
  },

  getAggregateBalance: () => request('/accounts/aggregate'),

  // Financial Double-Entry Operations (Mandatory Idempotency Key)
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

  // Admin & Auditor
  getAdminUsers: () => request('/admin/users'),

  // Maker-Checker Account Opening Requests
  createAccountRequest: (data) => request('/account-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getAccountRequests: (status) => request(status ? `/account-requests?status=${status}` : '/account-requests'),

  approveAccountRequest: (id, adminNotes) => request(`/account-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: adminNotes || 'Approved and provisioned vault by administrator' })
  }),

  rejectAccountRequest: (id, adminNotes) => request(`/account-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: adminNotes || 'Declined during onboarding review' })
  }),

  // Maker-Checker Deposit Approvals
  createDepositRequest: (data) => request('/deposit-requests', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getDepositRequests: (status) => request(status ? `/deposit-requests?status=${status}` : '/deposit-requests'),

  approveDepositRequest: (id, adminNotes) => request(`/deposit-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: adminNotes || 'Approved by administrator' })
  }),

  rejectDepositRequest: (id, adminNotes) => request(`/deposit-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: adminNotes || 'Rejected by administrator' })
  }),

  adminDeposit: (data, idempotencyKey) => request('/admin/deposits', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey || generateUUID()
    },
    body: JSON.stringify(data)
  }),

  getAuditLogs: () => request('/audit-logs'),

  // Health and Invariant Verification
  getHealth: () => request('/health')
};
