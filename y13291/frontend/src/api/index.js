import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/',
  timeout: 60000
})

request.interceptors.response.use(
  response => response.data,
  error => {
    const msg = error.response?.data?.detail || error.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export const api = {
  dashboard: () => request.get('/api/feedbacks/dashboard'),
  statusInfo: () => request.get('/api/feedbacks/meta/status-info'),

  list: params => request.get('/api/feedbacks', { params }),
  get: id => request.get(`/api/feedbacks/${id}`),
  create: data => request.post('/api/feedbacks', data),
  update: (id, data) => request.put(`/api/feedbacks/${id}`, data),
  delete: id => request.delete(`/api/feedbacks/${id}`),
  changeStatus: (id, data) => request.patch(`/api/feedbacks/${id}/status`, data),

  logs: id => request.get(`/api/feedbacks/${id}/logs`),
  merges: id => request.get(`/api/feedbacks/${id}/merges`),
  createMerge: data => request.post('/api/feedbacks/merges', data),
  suggestDuplicates: () => request.get('/api/feedbacks/duplicates/suggest'),

  evidences: id => request.get(`/api/feedbacks/${id}/evidences`),
  addEvidence: (id, data) => request.post(`/api/feedbacks/${id}/evidences`, { feedback_id: id, ...data }),

  importExcel: (file, operator = 'system') => {
    const form = new FormData()
    form.append('file', file)
    return request.post('/api/feedbacks/import', form, {
      params: { operator },
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  exportExcel: params => {
    return axios.get('/api/feedbacks/export/excel', {
      params,
      responseType: 'blob'
    }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename\*?=.*?''?([^;]+)/i)
      const filename = match ? decodeURIComponent(match[1]) : '慢行桥坡道容量复核.xlsx'
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    })
  },

  exportPdf: params => {
    return axios.get('/api/feedbacks/export/pdf', {
      params,
      responseType: 'blob'
    }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const disposition = res.headers['content-disposition'] || ''
      const match = disposition.match(/filename\*?=.*?''?([^;]+)/i)
      const filename = match ? decodeURIComponent(match[1]) : '慢行桥坡道容量复核报告.pdf'
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    })
  }
}

export default request
