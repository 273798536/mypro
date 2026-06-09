import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err?.response?.data?.detail || err.message || '请求失败'
    window.__lastError = msg
    return Promise.reject(new Error(msg))
  }
)

export const api = {
  health: () => request.get('/health'),

  importBatch: (file, source = 'error_analysis', operator = '排课老师') => {
    const fd = new FormData()
    fd.append('file', file)
    return request.post('/batches/import', fd, { params: { source, operator } })
  },

  listBatches: (source) => request.get('/batches', { params: source ? { source } : {} }),

  getBatch: (id) => request.get(`/batches/${id}`),

  getBatchRecords: (id, params = {}) => request.get(`/batches/${id}/records`, { params }),

  getBatchChart: (id) => request.get(`/batches/${id}/chart`),

  getBatchIssues: (id, resolved) => request.get(`/batches/${id}/issues`, {
    params: resolved !== undefined ? { resolved } : {},
  }),

  exportBatch: (id) => {
    const a = document.createElement('a')
    a.href = `/api/batches/${id}/export`
    a.click()
    return Promise.resolve()
  },

  getRecord: (id) => request.get(`/records/${id}`),

  updateRecord: (id, data) => request.put(`/records/${id}`, data),

  getAuditLogs: (id) => request.get(`/records/${id}/audit`),

  resolveIssue: (id) => request.post(`/issues/${id}/resolve`),
}
