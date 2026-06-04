export interface Workshop {
  id: string
  name: string
  floorPlanPath: string | null
  createdAt: string
  defectCount?: number
  stats?: {
    totalDefects: number
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    resolvedCount: number
    offlineAssetCount: number
    coordinateOffsetCount: number
  }
}

export interface Defect {
  id: string
  workshopId: string
  type: string
  colorRuleId: string | null
  status: "pending" | "approved" | "rejected" | "resolved"
  posX: number
  posY: number
  width: number
  height: number
  description: string
  source: "manual" | "import"
  importBatchId: string | null
  isOfflineAsset: number
  coordinateOffset: number
  createdAt: string
  updatedAt: string
}

export interface DefectDetail extends Defect {
  statusLogs: StatusTransition[]
  opinions: HandlingOpinion[]
}

export interface CreateDefectRequest {
  type: string
  colorRuleId?: string | null
  posX: number
  posY: number
  width: number
  height: number
  description: string
  source?: string
}

export interface ColorRule {
  id: string
  workshopId: string
  name: string
  color: string
  description: string
  defectCount: number
}

export interface StatusTransition {
  id: string
  defectId: string
  fromStatus: string
  toStatus: string
  operator: string
  createdAt: string
}

export interface HandlingOpinion {
  id: string
  defectId: string
  content: string
  author: string
  createdAt: string
}

export interface ImportResult {
  batchId: string
  total: number
  imported: number
  duplicates: number
  anomalies: AnomalyItem[]
}

export interface AnomalyItem {
  row: number
  reason: "offline_asset_missing" | "color_rule_mismatch" | "coordinate_offset" | "duplicate"
  detail: string
}

export interface ExportConsistencyCheck {
  isConsistent: boolean
  mismatches: MismatchItem[]
  totalDefects?: number
}

export interface MismatchItem {
  defectId: string
  uiStatus: string
  dataStatus: string
}
