export interface Material {
  type: "training_log" | "supplementary_note" | "verbal_note"
  description: string
  revised: boolean
  revisedAt?: string
  revisedContent?: string
}

export interface ReplayRecord {
  id: string
  title: string
  status: "processed" | "pending_material" | "manual_override"
  recordType: "normal" | "supplementary" | "anomaly"
  featureLateFlag: boolean
  materials: Material[]
  createdAt: string
  updatedAt: string
}

export interface ManualCorrection {
  field: string
  previousValue: string | number
  correctedValue: string | number
  correctedBy: string
  correctedAt: string
  reason: string
}

export interface MetricChange {
  name: string
  previous: number
  current: number
  unit: string
}

export interface VersionComparison {
  recordId: string
  sampleChange: { previous: number; current: number; delta: number }
  thresholdChange: { previous: number; current: number; reason: string }
  manualCorrections: ManualCorrection[]
  metricChanges: MetricChange[]
}

export interface Report {
  generatedAt: string
  processedItems: ReplayRecord[]
  pendingMaterialItems: ReplayRecord[]
  manualOverrideItems: ReplayRecord[]
}

export type StatusFilter = "all" | "processed" | "pending_material" | "manual_override"
