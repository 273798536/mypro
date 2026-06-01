export interface TrainingSample {
  id: string
  features: Record<string, number | string>
  target?: number | string
  groupId?: string
}

export interface FeatureEntry {
  name: string
  importance: number
  category?: string
  isLeakage: boolean
  leakageReason?: string
  sparsityByGroup: Record<string, number>
}

export interface CustomerGroup {
  groupId: string
  groupName: string
  sampleCount: number
  featureCoverage: Record<string, number>
}

export interface DataVersion {
  source: "training" | "feature" | "group"
  version: string
  importedAt: number
  isLate: boolean
  conflicts: ConflictRecord[]
}

export interface ConflictRecord {
  id: string
  type: "feature_mismatch" | "group_key_missing" | "sample_id_inconsistent" | "version_mix"
  severity: "high" | "medium" | "low"
  description: string
  detectedAt: number
  resolvedAt?: number
  resolution?: string
  relatedSources: Pick<DataVersion, "source" | "version" | "importedAt">[]
}

export interface AuditReport {
  id: string
  createdAt: number
  trainingVersion: string
  featureVersion: string
  groupVersion: string
  featureImportance: FeatureEntry[]
  leakageFeatures: FeatureEntry[]
  sparseGroups: CustomerGroup[]
  conflicts: ConflictRecord[]
}

export interface RawImportResult {
  headers: string[]
  rows: Record<string, string | number>[]
  rowCount: number
  importedAt: number
}
