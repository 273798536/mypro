import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const healthCheck = () => request.get('/health')

export const uploadData = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/import/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const getDataGaps = (params) => request.get('/import/gaps', { params })

export const fillDataGap = (gapId, data) =>
  request.put(`/import/gaps/${gapId}/fill`, null, { params: data })

export const getProcessingRecords = (params) =>
  request.get('/processing/records', { params })

export const getProcessingRecord = (id) =>
  request.get(`/processing/records/${id}`)

export const getProcessingStatistics = (params) =>
  request.get('/processing/statistics', { params })

export const getCalculationFormulas = () =>
  request.get('/calculation/formulas')

export const calculateTrajectoryDrift = (data) =>
  request.post('/calculation/trajectory-drift', data)

export const calculateWaterQuality = (data) =>
  request.post('/calculation/water-quality', data)

export const submitReview = (data) =>
  request.post('/review/submit', data)

export const updateProcessingOpinion = (recordId, data) =>
  request.put(`/review/processing-opinion/${recordId}`, null, { params: data })

export const getPendingReviews = () =>
  request.get('/review/pending')

export const traceAnomaly = (anomalyNo) =>
  request.get(`/trace/anomaly/${anomalyNo}`)

export const checkTraceChain = (anomalyNo) =>
  request.get(`/trace/check-chain/${anomalyNo}`)

export const exportProcessingRecords = (params) =>
  request.get('/export/processing-records', { params, responseType: 'blob' })

export const exportAnomalies = (params) =>
  request.get('/export/anomalies', { params, responseType: 'blob' })

export const exportGaps = (params) =>
  request.get('/export/gaps', { params, responseType: 'blob' })

export const exportRiskReport = (params) =>
  request.get('/export/risk-report', { params, responseType: 'blob' })

export const getInspectionPhoto = (inspectionId) =>
  request.get(`/photos/inspection/${inspectionId}`, { responseType: 'blob' })

export const getPhotoPreview = (inspectionId) =>
  request.get(`/photos/preview/${inspectionId}`)

export default request
