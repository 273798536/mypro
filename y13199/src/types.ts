export type BoundaryStatus = 'normal' | 'critical' | 'exceeded'
export type ReportStatus = 'processed' | 'pending_material' | 'manual_override'
export type ReportOrigin = 'new' | 'override' | 'subreport'
export type DuplicateMode = 'override' | 'subreport' | null

export interface TensionReport {
  id: string
  equipmentId: string
  loadWeight: number
  pulleyCount: number
  gravity: number
  tensionValue: number
  tensionUnit: 'kN'
  boundaryStatus: BoundaryStatus
  supplementaryNote: string
  conclusion: string
  pageSummary: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  origin: ReportOrigin
  parentId?: string
  subIndex?: number
  overriddenId?: string
}

export interface DuplicateDecision {
  isDuplicate: boolean
  existingReports: TensionReport[]
  mode: DuplicateMode
  overrideTargetId?: string
  parentId?: string
}

export interface BoundaryConfig {
  normalMax: number
  criticalMax: number
}

export interface EquipmentCheckResult {
  isDuplicate: boolean
  existingReports: TensionReport[]
  reason: string
  nextSteps: string[]
}

export const DEFAULT_BOUNDARY_CONFIG: BoundaryConfig = {
  normalMax: 50,
  criticalMax: 80,
}

export const DEFAULT_GRAVITY = 9.81

export const BOUNDARY_STATUS_LABELS: Record<BoundaryStatus, string> = {
  normal: '正常',
  critical: '临界',
  exceeded: '超限',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  processed: '已处理',
  pending_material: '待补材料',
  manual_override: '人工改判',
}
