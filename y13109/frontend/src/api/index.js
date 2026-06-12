import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const batchAPI = {
  list: () => api.get('/batches'),
  get: (id) => api.get(`/batches/${id}`),
  create: (name, threshold) => api.post('/batches', null, {
    params: { name, threshold }
  }),
  upload: (id, files) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    return api.post(`/batches/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  process: (id, params = {}) => api.post(`/batches/${id}/process`, null, { params }),
  override: (batchId, recordId, newStatus, operator, reason) =>
    api.post(`/batches/${batchId}/records/${recordId}/override`, null, {
      params: { new_status: newStatus, operator, reason }
    }),
  getOutOfBound: (id) => api.get(`/batches/${id}/out-of-bound`),
  getEmpty: (id) => api.get(`/batches/${id}/empty`),
  getReport: (id) => api.get(`/batches/${id}/report.md`, { responseType: 'text' }),
  updateGrayNote: (id, note) => api.patch(`/batches/${id}/gray-note`, null, { params: { note } })
}

export default api
