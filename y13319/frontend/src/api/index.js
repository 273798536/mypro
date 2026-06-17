import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export default {
  health: () => request.get('/health'),
  getVersions: () => request.get('/versions'),
  createVersion: (data) => request.post('/versions', data),
  getMetrics: (vid) => request.get(`/versions/${vid}/metrics`),
  getSamples: (vid, params) => request.get(`/versions/${vid}/samples`, { params }),
  trackSample: (sid) => request.get(`/samples/${sid}/track`),
  getCorrections: (vid, params) => request.get(`/versions/${vid}/corrections`, { params }),
  createCorrection: (vid, data) => request.post(`/versions/${vid}/corrections`, data),
  batchImportCorrections: (data) => request.post('/corrections/batch-import', data),
  updateCorrection: (id, data) => request.patch(`/corrections/${id}`, data),
  getAnomalies: (vid, params) => request.get(`/versions/${vid}/anomalies`, { params }),
  createAnomaly: (vid, data) => request.post(`/versions/${vid}/anomalies`, data),
  updateAnomaly: (id, data) => request.patch(`/anomalies/${id}`, data),
  batchImportSamples: (vid, data) => request.post(`/versions/${vid}/samples/batch`, data),
  getHistory: (params) => request.get('/history', { params }),
  compareVersions: (v1, v2) => request.get('/versions/compare', { params: { v1, v2 } }),
  getFieldMapping: () => request.get('/field-mapping'),
  addFieldMapping: (data) => request.post('/field-mapping', data),
  getReviewImpact: (vid) => request.get(`/review/impact/${vid}`)
}
