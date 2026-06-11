export interface AnnotationRegion {
  id: string
  type: 'contamination' | 'abnormality' | 'reference'
  x: number
  y: number
  width: number
  height: number
  label: string
}

export interface AnnotationData {
  regions: AnnotationRegion[]
  label: string
}

export interface SequencingDataPoint {
  position: number
  value: number
  quality: number
}

export interface SequencingResult {
  id: string
  sampleId: string
  maintainer: string
  data: SequencingDataPoint[]
  conclusion: string
  previousConclusion: string | null
  modifiedAt: string | null
  originalCreatedAt: string
}

export interface PathologyNote {
  id: string
  sampleId: string
  content: string
  isOld: boolean
  createdAt: string
}

export interface ReviewRecord {
  id: string
  contaminationMarkId: string
  reviewer: string
  reviewedAt: string
  decision: 'passed' | 'rejected'
  reason: string
  beforeAnnotation: AnnotationData
  afterAnnotation: AnnotationData
  relatedMaterials: string[]
}

export interface ContaminationMark {
  id: string
  sampleId: string
  source: string
  description: string
  detectedAt: string
  reviewStatus: 'pending' | 'passed' | 'rejected'
  reviewRecord: ReviewRecord | null
}

export interface Sample {
  id: string
  code: string
  source: string
  category: 'normal' | 'boundary' | 'bad'
  sequencingResultId: string
  pathologyNotes: PathologyNote[]
  contaminationMark: ContaminationMark | null
  reagentBatch: string | null
  oldRemark: string | null
  createdAt: string
  updatedAt: string | null
  missingTimestamp: boolean
  missingTimestampSource: string | null
}

export interface AuditLog {
  id: string
  entityType: 'sample' | 'sequencing' | 'contamination' | 'review'
  entityId: string
  action: string
  operator: string
  operatedAt: string
  reason: string
  beforeValue: string
  afterValue: string
}
