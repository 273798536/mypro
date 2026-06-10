export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: {
    code: string
    message: string
    actionable?: string
  } | null
}

export type RecordStatus = 'success' | 'pending' | 'bad'
export type Severity = 'low' | 'medium' | 'high'
export type ConclusionLevel = 'usable' | 'review' | 'reject'

export interface WeighingRow {
  id?: number
  recordId?: string
  rowIndex: number
  reagentName: string
  batchNo: string
  concentration: number
  weight: number
  purity: number
}

export interface WeighingRecord {
  id: string
  batchNo: string
  operator: string
  filename: string
  status: RecordStatus
  importedAt: string
  rows?: WeighingRow[]
}

export interface WeighingImportRequest {
  file: Express.Multer.File
}

export interface WeighingValidation {
  isValid: boolean
  missingFields: string[]
  suspiciousRows: number[]
}

export interface WeighingImportResponse {
  recordId: string
  validation: WeighingValidation
  previewData: WeighingRow[]
}

export interface Peak {
  id: string
  time: number
  temperature: number
  height: number
  width: number
}

export interface OverlapRegion {
  id: string
  startTime: number
  endTime: number
  peakCount: number
  confidence: number
}

export interface PeakAnalysisRequest {
  temperatureCurve: number[][]
}

export interface PeakAnalysisResult {
  id: string
  recordId: string
  peaks: Peak[]
  overlaps: OverlapRegion[]
  warnings: string[]
  createdAt: string
}

export interface MaterialFormula {
  formula: string
  coefficient?: number
}

export interface MaterialTraceItem {
  reagentName: string
  sourceRow: number
  batchNo: string
  concentration: number
  purity: number
  delta: string
}

export interface BalanceCalcRequest {
  reactants: MaterialFormula[]
  products: MaterialFormula[]
}

export interface BalanceCalcResult {
  id: string
  recordId: string
  balancedEquation: string
  enthalpyChange: number
  materialTrace: MaterialTraceItem[]
  status: RecordStatus
  createdAt: string
}

export type TraceType =
  | 'MISSING_CURVE'
  | 'CONCENTRATION_ERROR'
  | 'PEAK_UNCERTAIN'
  | 'BALANCE_FAILED'
  | 'MATERIAL_MISMATCH'
  | 'PURITY_ABNORMAL'
  | 'WEIGHT_OUT_OF_RANGE'
  | 'UNKNOWN_ERROR'

export interface TraceLog {
  id: string
  recordId: string
  severity: Severity
  type: TraceType
  message: string
  actionable: string
  createdAt: string
  resolved: boolean
  resolution?: string
}

export interface ReportPreview {
  id: string
  recordId: string
  conclusionLevel: ConclusionLevel
  summary: string
  peakAnalysis: PeakAnalysisResult | null
  balanceCalc: BalanceCalcResult | null
  traceLogs: TraceLog[]
  createdAt: string
}

export interface Material {
  batchNo: string
  name: string
  standardConc: number
  standardPurity: number
  supplier: string
}
