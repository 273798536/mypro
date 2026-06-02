export enum RegistrationStatus {
  PENDING = 'pending',
  MATERIALS_INCOMPLETE = 'materials_incomplete',
  REVIEWING = 'reviewing',
  REPERTOIRE_MISMATCH = 'repertoire_mismatch',
  PAYMENT_LATE = 'payment_late',
  DOCUMENT_MISSING = 'document_missing',
  PASSED = 'passed',
  REJECTED = 'rejected',
  SUPPLEMENT = 'supplement',
}

export enum AnomalyType {
  REPERTOIRE_MISMATCH = 'repertoire_mismatch',
  PAYMENT_LATE = 'payment_late',
  DOCUMENT_MISSING = 'document_missing',
  TEACHER_CONTRADICTION = 'teacher_contradiction',
  MATERIAL_INCOMPLETE = 'material_incomplete',
}

export interface Registration {
  id: string
  studentName: string
  gender: 'male' | 'female'
  idNumber: string
  examLevel: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  guideTeacher: string
  phone: string
  status: RegistrationStatus
  anomalies: AnomalyType[]
  createdAt: string
  updatedAt: string
  version: number
}

export interface Material {
  id: string
  registrationId: string
  type: 'application_form' | 'repertoire_page' | 'payment_receipt' | 'photo'
  name: string
  status: 'submitted' | 'pending' | 'rejected'
  submittedAt: string
  fileUrl?: string
}

export interface Repertoire {
  id: string
  registrationId: string
  name: string
  composer: string
  version: string
  source: 'application' | 'actual'
  isMatched: boolean
  mismatchReason?: string
}

export interface Payment {
  id: string
  registrationId: string
  amount: number
  expectedDate: string
  actualDate?: string
  status: 'pending' | 'paid' | 'overdue'
  isLate: boolean
  receiptUrl?: string
  lateFee?: number
}

export interface Document {
  id: string
  registrationId: string
  type: 'id_card' | 'previous_certificate' | 'photo' | 'other'
  status: 'valid' | 'expired' | 'missing'
  expiryDate?: string
  fileUrl?: string
  isMissing: boolean
  missingNote?: string
}

export interface TeacherNote {
  id: string
  registrationId: string
  teacherName: string
  content: string
  evidenceType: 'repertoire' | 'payment' | 'document' | 'other'
  createdAt: string
  isContradictory: boolean
}

export interface HistoryRecord {
  id: string
  registrationId: string
  operator: string
  action: string
  oldValue?: string
  newValue?: string
  createdAt: string
}

export interface Snapshot {
  id: string
  registrationId: string
  version: number
  data: Record<string, unknown>
  reason: string
  createdAt: string
}

export interface FilterOptions {
  keyword?: string
  status?: RegistrationStatus
  examLevel?: string
  anomalyType?: AnomalyType
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface DiffResult {
  field: string
  oldValue: unknown
  newValue: unknown
  changeType: 'added' | 'modified' | 'removed'
}

export type StoreName =
  | 'registrations'
  | 'materials'
  | 'repertoires'
  | 'payments'
  | 'documents'
  | 'teacherNotes'
  | 'historyRecords'
  | 'snapshots'

export interface StoreConfig {
  keyPath: string
  indexes: string[]
}
