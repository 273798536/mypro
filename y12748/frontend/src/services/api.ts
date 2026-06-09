import axios from 'axios'
import type {
  ImportBatch, QuestionRecord, CorrectionHistory, ReviewSession,
  ReviewResult, Report, ReliabilityCurve, ImportResult
} from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const batchApi = {
  list: (skip = 0, limit = 100) =>
    api.get<ImportBatch[]>('/batches', { params: { skip, limit } }).then(r => r.data),
  get: (id: number) =>
    api.get<ImportBatch>(`/batches/${id}`).then(r => r.data),
  create: (data: { batch_name: string; file_name?: string; remark?: string }) =>
    api.post<ImportBatch>('/batches', data).then(r => r.data),
  importFile: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ImportResult>(`/batches/${id}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  getRecords: (id: number, params?: { status?: string; has_issues?: boolean; skip?: number; limit?: number }) =>
    api.get<QuestionRecord[]>(`/batches/${id}/records`, { params }).then(r => r.data),
  getQualityIssues: (id: number) =>
    api.get(`/batches/${id}/quality-issues`).then(r => r.data)
}

export const recordApi = {
  list: (params?: { batch_id?: number; status?: string; has_issues?: boolean; skip?: number; limit?: number }) =>
    api.get<QuestionRecord[]>('/records', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<QuestionRecord>(`/records/${id}`).then(r => r.data),
  updateField: (id: number, data: { field_name: string; new_value: any; comment?: string }) =>
    api.patch<QuestionRecord>(`/records/${id}`, data).then(r => r.data),
  transitionStatus: (id: number, data: { record_id: number; from_status: string; to_status: string; comment?: string }) =>
    api.post<QuestionRecord>(`/records/${id}/status`, data).then(r => r.data),
  getCorrections: (id: number) =>
    api.get<CorrectionHistory[]>(`/records/${id}/corrections`).then(r => r.data),
  getReviewResults: (id: number) =>
    api.get<ReviewResult[]>(`/records/${id}/review-results`).then(r => r.data)
}

export const reviewApi = {
  createSession: (data: {
    batch_id: number; session_name: string; session_type?: string
    include_wrong_answers?: boolean; include_historical_answers?: boolean
    include_conflicts?: boolean; remark?: string
  }) =>
    api.post<ReviewSession>('/review/sessions', data).then(r => r.data),
  listSessions: (params?: { batch_id?: number; skip?: number; limit?: number }) =>
    api.get<ReviewSession[]>('/review/sessions', { params }).then(r => r.data),
  getSession: (id: number) =>
    api.get<ReviewSession>(`/review/sessions/${id}`).then(r => r.data),
  startSession: (id: number) =>
    api.post<ReviewSession>(`/review/sessions/${id}/start`).then(r => r.data),
  completeSession: (id: number) =>
    api.post<ReviewSession>(`/review/sessions/${id}/complete`).then(r => r.data),
  getSessionItems: (id: number) =>
    api.get<QuestionRecord[]>(`/review/sessions/${id}/items`).then(r => r.data),
  createResult: (data: {
    session_id: number; record_id: number; before_status: string
    after_status: string; review_comment?: string
    is_conflict_resolved?: boolean; conflict_resolution?: string
  }) =>
    api.post<ReviewResult>('/review/results', data).then(r => r.data),
  getSessionResults: (id: number, params?: { skip?: number; limit?: number }) =>
    api.get<ReviewResult[]>(`/review/sessions/${id}/results`, { params }).then(r => r.data),
  batchReview: (id: number, decisions: any[]) =>
    api.post(`/review/sessions/${id}/batch-review`, decisions).then(r => r.data)
}

export const calculateApi = {
  reliabilityCurve: (record_ids: number[], session_id?: number) =>
    api.post('/calculate/reliability-curve', { record_ids, session_id }).then(r => r.data),
  arrhenius: (data: { lifetime_ref: number; activation_energy: number; temp_ref: number; temp_actual: number }) =>
    api.post('/calculate/arrhenius', null, { params: data }).then(r => r.data),
  inversePowerLaw: (data: { lifetime_ref: number; stress_ref: number; stress_actual: number; exponent: number }) =>
    api.post('/calculate/inverse-power-law', null, { params: data }).then(r => r.data),
  eyring: (data: {
    lifetime_ref: number; temp_ref: number; temp_actual: number
    stress_ref: number; stress_actual: number; activation_energy: number; exponent: number
  }) =>
    api.post('/calculate/eyring', null, { params: data }).then(r => r.data),
  listCurves: (params?: { batch_id?: number; session_id?: number; skip?: number; limit?: number }) =>
    api.get<ReliabilityCurve[]>('/calculate/curves', { params }).then(r => r.data),
  getCurve: (id: number) =>
    api.get<ReliabilityCurve>(`/calculate/curves/${id}`).then(r => r.data)
}

export const reportApi = {
  generate: (data: { session_id: number; batch_id: number; report_type?: string }) =>
    api.post<Report>('/reports', data).then(r => r.data),
  list: (params?: { session_id?: number; batch_id?: number; report_type?: string; skip?: number; limit?: number }) =>
    api.get<Report[]>('/reports', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<Report>(`/reports/${id}`).then(r => r.data),
  download: (id: number) =>
    api.get(`/reports/${id}/download`, { responseType: 'blob' }).then(r => r.data),
  getStudentView: (id: number) =>
    api.get(`/reports/${id}/student-view`).then(r => r.data)
}

export const systemApi = {
  stats: () => api.get('/system/stats').then(r => r.data),
  initSample: () => api.post('/system/init-sample-data').then(r => r.data),
  firstRunCheck: () => api.get('/system/first-run-check').then(r => r.data),
  traces: (params?: { batch_id?: number; limit?: number }) =>
    api.get('/system/traces', { params }).then(r => r.data)
}
