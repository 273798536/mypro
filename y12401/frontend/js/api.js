const API_BASE = 'http://localhost:3001/api';

const api = {
  async get(url, params = {}) {
    const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const fullUrl = `${API_BASE}${url}${query ? '?' + query : ''}`;
    const res = await axios.get(fullUrl);
    return res.data;
  },
  async post(url, data = {}) {
    const res = await axios.post(`${API_BASE}${url}`, data);
    return res.data;
  },

  invoices: {
    list: (params) => api.get('/invoices', params),
    get: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    redInvoice: (id, data) => api.post(`/invoices/${id}/red-invoice`, data),
    trace: (id) => api.get(`/invoices/${id}/trace`),
  },

  paymentPlans: {
    list: (params) => api.get('/payment-plans', params),
    get: (id) => api.get(`/payment-plans/${id}`),
    create: (data) => api.post('/payment-plans', data),
    adjust: (id, data) => api.post(`/payment-plans/${id}/adjust`, data),
    trace: (id) => api.get(`/payment-plans/${id}/trace`),
  },

  discountRules: {
    list: (params) => api.get('/discount-rules', params),
    matching: (params) => api.get('/discount-rules/matching', params),
    create: (data) => api.post('/discount-rules', data),
  },

  discountQuotes: {
    list: (params) => api.get('/discount-quotes', params),
    get: (id) => api.get(`/discount-quotes/${id}`),
    calculate: (data) => api.post('/discount-quotes/calculate', data),
    create: (data) => api.post('/discount-quotes', data),
    submit: (id, data) => api.post(`/discount-quotes/${id}/submit`, data),
    approve: (id, data) => api.post(`/discount-quotes/${id}/approve`, data),
    reject: (id, data) => api.post(`/discount-quotes/${id}/reject`, data),
    execute: (id, data) => api.post(`/discount-quotes/${id}/execute`, data),
    cancel: (id, data) => api.post(`/discount-quotes/${id}/cancel`, data),
    trace: (id) => api.get(`/discount-quotes/${id}/trace`),
    totalSavings: (params) => api.get('/discount-quotes/summary/total-savings', params),
  },

  auditLogs: {
    list: (params) => api.get('/audit-logs', params),
    getByEntity: (entityType, entityId) => api.get(`/audit-logs/${entityType}/${entityId}`),
  },

  health: () => api.get('/health'),
};
