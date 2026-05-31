export type MaterialType = 'policyCard' | 'medicalRecord' | 'invoice' | 'clause'
export type Verdict = 'approved' | 'rejected' | 'pending_review'
export type TrapType = 'waiting_period' | 'invoice_duplicate' | 'clause_expired'

export interface MaterialBase {
  id: string
  caseId: string
  sourcePerson: string
  importTime: string
}

export interface PolicyCard extends MaterialBase {
  materialType: 'policyCard'
  policyNumber: string
  insuranceType: string
  coverageAmount: number
  effectiveDate: string
  expirationDate: string
  waitingPeriodDays: number
}

export interface MedicalRecord extends MaterialBase {
  materialType: 'medicalRecord'
  policyCardId: string
  diagnosis: string
  visitDate: string
  hospitalName: string
}

export interface Invoice extends MaterialBase {
  materialType: 'invoice'
  policyCardId: string
  invoiceNumber: string
  amount: number
  invoiceDate: string
  isDuplicate: boolean
}

export interface Clause extends MaterialBase {
  materialType: 'clause'
  clauseName: string
  content: string
  effectiveDate: string
  expirationDate: string
  isExpired: boolean
}

export type Material = PolicyCard | MedicalRecord | Invoice | Clause

export interface Judgment {
  id: string
  materialId: string
  materialType: MaterialType
  verdict: Verdict
  reason: string
  timestamp: number
  isCorrect: boolean
  trapId?: string
}

export interface Trap {
  id: string
  caseId: string
  trapType: TrapType
  description: string
  relatedMaterialIds: string[]
  correctHandling: string
}

export interface TrapHit {
  id: string
  judgmentId: string
  trapId: string
  trapType: TrapType
  explanation: string
}

export interface LinkageEntry {
  policyCardId: string
  medicalRecordId?: string
  invoiceId?: string
  clauseId?: string
  judgmentId: string
  description: string
}

export interface ReplayEvent {
  timestamp: number
  action: string
  materialId?: string
  materialType?: MaterialType
  detail: string
}

export interface CaseData {
  id: string
  title: string
  description: string
  difficulty: number
  timeLimitSeconds: number
  caseDate: string
  policyCards: PolicyCard[]
  medicalRecords: MedicalRecord[]
  invoices: Invoice[]
  clauses: Clause[]
  traps: Trap[]
  expectedJudgments: Array<{
    materialId: string
    expectedVerdict: Verdict
    trapId?: string
  }>
}

export interface GameReport {
  reportMeta: {
    caseId: string
    caseTitle: string
    detectiveName: string
    reviewTime: string
    timeUsed: number
  }
  policyCards: PolicyCard[]
  medicalRecords: MedicalRecord[]
  invoices: Invoice[]
  clauses: Clause[]
  judgments: Judgment[]
  traps: Array<{
    trapType: TrapType
    description: string
    relatedMaterialIds: string[]
    correctHandling: string
    wasTriggered: boolean
  }>
  linkageMap: LinkageEntry[]
  replayTimeline: ReplayEvent[]
}

export interface GameState {
  currentCase: CaseData | null
  judgments: Judgment[]
  trapHits: TrapHit[]
  replayEvents: ReplayEvent[]
  timeRemaining: number
  gameStarted: boolean
  gameEnded: boolean
  selectedMaterialId: string | null
  feedbackModal: {
    visible: boolean
    judgment: Judgment | null
    trapHit: TrapHit | null
    correctVerdict: Verdict | null
    correctReason: string
  }
  completedCases: Record<string, {
    score: number
    correctCount: number
    totalCount: number
    trapIdentifiedCount: number
    timeUsed: number
  }>
}
