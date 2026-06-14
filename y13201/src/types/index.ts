export type ConflictStatus = 'normal' | 'auth_expired' | 'name_mismatch'

export interface ConflictRecord {
  id: string
  title: string
  status: ConflictStatus
  note: string
  auth_expired: number | boolean
  auth_note: string
  created_at: string
  updated_at: string
  tracks?: TrackItem[]
  noteHistory?: NoteHistoryItem[]
}

export interface TrackItem {
  id: string
  name: string
  display_name: string
  batch: number
  submitted_at: string
  conflict_id: string | null
  is_supplementary: number | boolean
  confirmed: number | boolean
}

export interface NoteHistoryItem {
  id: string
  conflict_id: string
  content: string
  is_supplementary: number | boolean
  operator_role: 'manager' | 'coordinator' | 'teacher'
  created_at: string
}

export interface StatusSummary {
  total: number
  normal: number
  auth_expired: number
  name_mismatch: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const STATUS_LABEL: Record<ConflictStatus, string> = {
  normal: '正常',
  auth_expired: '授权到期',
  name_mismatch: '名称不一致',
}

export const ROLE_LABEL: Record<string, string> = {
  manager: '负责人',
  coordinator: '演出统筹',
  teacher: '老师',
}
