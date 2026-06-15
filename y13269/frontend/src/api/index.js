import { get, post, patch, del } from './request'

export const uploadFile = (formData) => {
  return post('/upload/files', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

export const getRecords = (params = {}) => {
  return get('/records', params)
}

export const getRecord = (id) => {
  return get(`/records/${id}`)
}

export const updateRecord = (id, data) => {
  return patch(`/records/${id}`, data)
}

export const deleteRecord = (id) => {
  return del(`/records/${id}`)
}

export const getStatistics = () => {
  return get('/records/statistics')
}

export const consistencyScan = () => {
  return post('/consistency/scan')
}

export const consistencyResolve = (a, b, fields) => {
  return post(`/consistency/resolve/${a}/${b}`, { fields })
}

export const coordVerify = (ids) => {
  return post('/coord/verify', { ids })
}

export const coordConfirm = (id, data) => {
  return post(`/coord/confirm/${id}`, data)
}

export const mergeScan = () => {
  return post('/merge/scan')
}

export const mergePropose = (keep, remove) => {
  return post(`/merge/propose/${keep}/${remove}`)
}

export const mergeExecute = (keep, remove) => {
  return post(`/merge/execute/${keep}/${remove}`)
}

export const exportExcel = (ids = null) => {
  return post('/export/excel', { ids }, {
    responseType: 'blob'
  })
}

export const getUnifiedNotes = () => {
  return get('/notes/unified')
}

export const createUnifiedNote = (data) => {
  return post('/notes/unified', data)
}

export default {
  uploadFile,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
  getStatistics,
  consistencyScan,
  consistencyResolve,
  coordVerify,
  coordConfirm,
  mergeScan,
  mergePropose,
  mergeExecute,
  exportExcel,
  getUnifiedNotes,
  createUnifiedNote
}
