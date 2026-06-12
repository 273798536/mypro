import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    ElMessage.error(err.response?.data?.detail || err.message || '请求失败')
    return Promise.reject(err)
  }
)

export const tideApi = {
  calc: (data, force = false) => api.post('/tide-window/calculate', data, { params: { force_recompute: force } }),
  list: (params) => api.get('/tide-window/results', { params }),
  detail: (id) => api.get(`/tide-window/results/${id}`),
  summary: (id) => api.get(`/tide-window/results/${id}/summary`),
  correct: (id, data) => api.post(`/tide-window/results/${id}/correct`, data),
  confirm: (id, params) => api.post(`/tide-window/results/${id}/confirm`, null, { params }),
  audit: (id) => api.get(`/tide-window/results/${id}/audit-log`),
  formulas: () => api.get('/tide-window/formulas'),
  dashboard: () => api.get('/tide-window/dashboard'),
}

export const importApi = {
  importTide: (data, params) => api.post('/import/tide/batch', data, { params }),
  importWater: (data, params) => api.post('/import/water/batch', data, { params }),
  batches: (params) => api.get('/import/batches', { params }),
  tideRecords: (params) => api.get('/import/tide/records', { params }),
  waterRecords: (params) => api.get('/import/water/records', { params }),
}

export const trajApi = {
  import: (data, params) => api.post('/trajectory-cleaning/import', data, { params }),
  list: (params) => api.get('/trajectory-cleaning/records', { params }),
  clean: (ids, params) => api.post('/trajectory-cleaning/clean/batch', ids, { params }),
  verify: (ids, params) => api.post('/trajectory-cleaning/verify/batch', ids, { params }),
}

export const exampleApi = {
  seed: (force = false) => api.post('/example/seed', null, { params: { force } }),
  summary: () => api.get('/example/summary'),
}

export default api
