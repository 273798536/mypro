import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.response.use(
  res => res.data,
  err => {
    console.error('API Error:', err.response?.data || err.message)
    return Promise.reject(err.response?.data || { error: err.message })
  }
)

export const dashboardApi = {
  overview: () => api.get('/dashboard/overview'),
}

export const locationsApi = {
  list: (params) => api.get('/locations', { params }),
  get: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
}

export const batchesApi = {
  list: (params) => api.get('/batches', { params }),
  get: (id) => api.get(`/batches/${id}`),
  trace: (id) => api.get(`/batches/${id}/trace`),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
  delete: (id) => api.delete(`/batches/${id}`),
}

export const recordsApi = {
  list: (params) => api.get('/records', { params }),
  get: (id) => api.get(`/records/${id}`),
  create: (data) => api.post('/records', data),
  update: (id, data) => api.put(`/records/${id}`, data),
  delete: (id) => api.delete(`/records/${id}`),
  addComment: (id, data) => api.post(`/records/${id}/comments`, data),
  stats: (params) => api.get('/records/stats/summary', { params }),
}

export const importApi = {
  batch: (data) => api.post('/import/batch', data),
  logs: () => api.get('/import/logs'),
  logDetail: (id) => api.get(`/import/logs/${id}`),
}

export const reportsApi = {
  monthly: (params) => api.get('/reports/monthly', { params }),
  exportCsv: (params) => {
    const query = new URLSearchParams(params).toString()
    window.open(`/api/reports/export/csv?${query}`, '_blank')
  },
}

export default api
