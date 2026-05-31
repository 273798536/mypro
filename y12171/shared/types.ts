export interface SamplePack {
  id: string
  name: string
  vendor: string
  purchaseDate: string
  cost: number
  fileCount: number
  notes?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface LicenseAgreement {
  id: string
  samplePackId: string
  licenseType: 'commercial' | 'non-commercial' | 'royalty-free' | 'custom'
  licenseName: string
  validFrom: string
  validUntil?: string
  isPerpetual: boolean
  allowedUses: string[]
  restrictions: string[]
  attributionRequired: boolean
  maxCopies?: number
  territories?: string[]
  notes?: string
  rawContent?: string
  createdAt: string
  updatedAt: string
}

export interface TrackProject {
  id: string
  name: string
  artist: string
  album?: string
  releaseDate?: string
  status: 'draft' | 'in-progress' | 'released' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface SampleUsage {
  id: string
  trackProjectId: string
  samplePackId: string
  sampleFileName: string
  usageDescription?: string
  duration?: string
  isModified: boolean
  createdAt: string
  updatedAt: string
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface RiskAlert {
  id: string
  type: 'expiration' | 'conflict' | 'restriction' | 'missing-info' | 'attribution'
  level: RiskLevel
  title: string
  description: string
  actionableAdvice: string[]
  relatedEntityId: string
  relatedEntityType: 'sample-pack' | 'license' | 'track' | 'usage'
  createdAt: string
}

export interface NameConflict {
  sampleName: string
  packIds: string[]
  recommendation: string
}

export interface DataQualityIssue {
  id: string
  entityType: 'sample-pack' | 'license' | 'track' | 'usage'
  entityId: string
  fieldName: string
  issueType: 'missing' | 'inconsistent' | 'suspicious' | 'format'
  severity: 'high' | 'medium' | 'low'
  description: string
  suggestion: string
}

export interface VersionSnapshot {
  id: string
  timestamp: string
  description: string
  dataHash: string
  entitiesCount: {
    samplePacks: number
    licenses: number
    tracks: number
    usages: number
  }
  riskSummary: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface LicenseValidationResult {
  isValid: boolean
  expirationStatus: 'active' | 'expiring-soon' | 'expired' | 'perpetual'
  daysUntilExpiration?: number
  commercialUseAllowed: boolean
  attributionRequired: boolean
  restrictions: string[]
  warnings: string[]
}

export interface LedgerDashboardData {
  summary: {
    totalPacks: number
    totalLicenses: number
    activeTracks: number
    totalCost: number
  }
  risks: RiskAlert[]
  expiringLicenses: Array<{
    id: string
    samplePackName: string
    licenseName: string
    validUntil: string
    daysLeft: number
  }>
  nameConflicts: NameConflict[]
  dataQualityIssues: DataQualityIssue[]
  timeline: Array<{
    date: string
    purchases: number
    releases: number
  }>
  versionHistory: VersionSnapshot[]
}
