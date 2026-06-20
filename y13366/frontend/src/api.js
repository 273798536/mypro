import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const snapshotApi = {
  list: (params) => api.get('/snapshots', { params }).then(r => r.data),
  get: (id) => api.get(`/snapshots/${id}`).then(r => r.data),
  create: (data) => api.post('/snapshots', data).then(r => r.data),

  listTrainingLogs: (id) => api.get(`/snapshots/${id}/training-logs`).then(r => r.data),
  attachTrainingLog: (id, formData) => api.post(`/snapshots/${id}/training-logs`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  updateThreshold: (id, data) => api.put(`/snapshots/${id}/threshold`, data).then(r => r.data),

  listJudgments: (id) => api.get(`/snapshots/${id}/judgments`).then(r => r.data),
  updateJudgment: (id, data, is_temporary = false, editor_role = 'evaluator') =>
    api.put(`/snapshots/${id}/judgments`, data, { params: { is_temporary, editor_role } }).then(r => r.data),
  getJudgmentHistory: (id, sampleId) =>
    api.get(`/snapshots/${id}/judgments/${sampleId}/history`).then(r => r.data),
  getAllJudgmentHistories: (id) =>
    api.get(`/snapshots/${id}/judgments/history`).then(r => r.data),

  listFeatureMaterials: (id) => api.get(`/snapshots/${id}/feature-materials`).then(r => r.data),
  attachFeatureMaterial: (id, formData) => api.post(`/snapshots/${id}/feature-materials`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),

  getChanges: (id) => api.get(`/snapshots/${id}/changes`).then(r => r.data),
  explainChange: (params) => api.post('/snapshots/explain-change', null, { params }).then(r => r.data),
  compare: (id1, id2) => api.get(`/snapshots/${id1}/compare/${id2}`).then(r => r.data),

  sealMonth: (formData) => api.post('/snapshots/seal-month', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
}

export default api
