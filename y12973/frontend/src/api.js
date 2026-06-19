import axios from 'axios'
import { message } from 'antd'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => {
    if (res.data && res.data.code === 0) {
      return res.data.data
    }
    if (res.data && res.data.msg) {
      message.error(res.data.msg)
    }
    return Promise.reject(res.data || res)
  },
  (err) => {
    message.error(err.message || '网络错误')
    return Promise.reject(err)
  }
)

export const healthCheck = () => axios.get('/health')

export const getDashboardStats = (params) => api.get('/dashboard/stats', { params })
export const listBatches = (params) => api.get('/batches', { params })
export const getBatchDetail = (id) => api.get(`/batches/${id}`)
export const importBatch = (data) => api.post('/batches/import', data)
export const downloadBatch = (id, format = 'csv') => {
  const url = `/api/batches/${id}/download?format=${format}`
  window.open(url, '_blank')
}
export const createConclusion = (data) => api.post('/conclusions', data)
export const getConclusionHistory = (id) => api.get(`/conclusions/${id}/history`)
export const registerMigration = (data) => api.post('/migration_scripts', data)
export const getMigrationScript = (identifier) => api.get(`/migration_scripts/${identifier}`)
export const compareBatches = (params) => api.get('/compare_batches', { params })

export default api
