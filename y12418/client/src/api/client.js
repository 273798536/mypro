import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const contractsAPI = {
  list: (params) => client.get('/contracts', { params }).then(r => r.data),
  get: (id) => client.get(`/contracts/${id}`).then(r => r.data),
  updateRemark: (id, remark) => client.post(`/contracts/${id}/remark`, { remark }).then(r => r.data)
}

export const deferralAPI = {
  list: (params) => client.get('/deferral/calculations', { params }).then(r => r.data),
  calculate: (data) => client.post('/deferral/calculate', data).then(r => r.data),
  getDiscrepancy: (contractId, month) => client.get(`/deferral/discrepancy/${contractId}/${month}`).then(r => r.data),
  correct: (id, data) => client.post(`/deferral/${id}/correct`, data).then(r => r.data),
  getHistory: (id) => client.get(`/deferral/${id}/history`).then(r => r.data),
  getOverview: (contractId, params) => client.get(`/deferral/overview/${contractId}`, { params }).then(r => r.data)
}

export const reportsAPI = {
  list: (params) => client.get('/reports', { params }).then(r => r.data),
  export: (data) => client.post('/reports/export', data).then(r => r.data),
  download: (id) => window.open(`/api/reports/download/${id}`),
  compare: (reportId1, reportId2) => 
    client.get('/reports/compare', { params: { reportId1, reportId2 } }).then(r => r.data)
}

export const rulesAPI = {
  list: () => client.get('/rules').then(r => r.data),
  create: (data) => client.post('/rules', data).then(r => r.data),
  activate: (id) => client.post(`/rules/${id}/activate`).then(r => r.data)
}

export const recordsAPI = {
  addEntry: (data) => client.post('/records/entry', data).then(r => r.data),
  deleteEntry: (id) => client.delete(`/records/entry/${id}`).then(r => r.data),
  addFreeze: (data) => client.post('/records/freeze', data).then(r => r.data),
  addMakeup: (data) => client.post('/records/makeup', data).then(r => r.data),
  withdrawMakeup: (id) => client.post(`/records/makeup/${id}/withdraw`).then(r => r.data),
  addTransfer: (data) => client.post('/records/transfer', data).then(r => r.data)
}

export default client
