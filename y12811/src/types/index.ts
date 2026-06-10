export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

export type GramStainType = 'positive' | 'negative' | 'not-applicable' | 'variable' | 'unknown'

export type MicrobeCategory = 'bacteria' | 'fungi' | 'archaea' | 'virus'

export type PathogenicityType = 'pathogenic' | 'opportunistic' | 'non-pathogenic'

export type SampleStatusType = 'normal' | 'low-quality' | 'contaminated' | 'control-abnormal' | 'pending-review' | 'warning' | 'error'

export type SampleType = 'clinical' | 'environmental' | 'negative-control' | 'positive-control'

export interface Microbe {
  id: string
  name: string
  scientificName: string
  taxonomy?: string
  category: MicrobeCategory
  gramStain: GramStainType
  gram?: 'positive' | 'negative' | 'unknown'
  description: string
  pathogenicity: PathogenicityType
}

export interface Sample {
  id: string
  name: string
  barcode?: string
  type: SampleType
  status: SampleStatusType
  collectionDate: string
  collectTime?: string
  collectionSite: string
  collector?: string
  patientId?: string
  sequencer?: string
  sequencingDate?: string
  readCount?: number
  q30?: number
  description?: string
}

export interface AbundanceEntry {
  id?: string
  sampleId: string
  microbeId: string
  abundance: number | null
  relativeAbundance?: number
  normalizedAbundance?: number
  confidence?: number
}

export interface AbundanceData {
  id: string
  sampleId: string
  microbeId: string
  abundance: number
  relativeAbundance: number
}

export interface HeatmapCellData {
  sampleId: string
  microbeId: string
  abundance: number
  relativeAbundance: number
  sampleName: string
  microbeName: string
}

export interface HeatmapChartProps {
  data: AbundanceEntry[]
  microbes: Microbe[]
  samples: Sample[]
  onCellClick?: (cellData: HeatmapCellData) => void
  onCellHover?: (cellData: HeatmapCellData | null) => void
  selectedSample?: string | null
  selectedMicrobe?: string | null
}

export interface HeatmapTooltipProps {
  microbeName: string
  sampleName: string
  abundance: number
  relativeAbundance: number
  position: { x: number; y: number }
  visible: boolean
}

export interface ColorLegendProps {
  minValue: number
  maxValue: number
  title?: string
}

export interface QCMetric {
  name: string
  value: number
  unit?: string
  status: StatusType
  threshold: {
    min?: number
    max?: number
    warningMin?: number
    warningMax?: number
  }
}

export interface SampleItem {
  id: string
  name: string
  barcode: string
  type: string
  status: StatusType
  collectTime?: string
}

export interface LineageStep {
  id: string
  name: string
  status: StatusType
  time: string
  operator: string
  description?: string
  isKey?: boolean
}

export interface StatusBadgeProps {
  status: StatusType
  text?: string
  showIcon?: boolean
  size?: string
  className?: string
}

export type ChangeStatus = 'pending' | 'approved' | 'rejected'

export interface FieldChange {
  field: string
  label: string
  oldValue: unknown
  newValue: unknown
  type: 'add' | 'delete' | 'modify'
}

export interface ChangeRecord {
  id: string
  operator: {
    id: string
    name: string
    avatar?: string
  }
  timestamp: string
  reason: string
  status: ChangeStatus
  fields: FieldChange[]
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

export interface ChangeTimelineProps {
  changes: ChangeRecord[]
  onItemClick?: (change: ChangeRecord) => void
}

export interface TimelineItemProps {
  change: ChangeRecord
  isLast?: boolean
  isExpanded?: boolean
  onToggle?: () => void
  onClick?: () => void
}

export interface FieldConfig {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  formatter?: (value: unknown) => string
}

export interface CompareViewProps {
  oldData: Record<string, unknown>
  newData: Record<string, unknown>
  fields: FieldConfig[]
  mode?: 'table' | 'keyValue'
  showOnlyDiff?: boolean
}

export interface DiffHighlightProps {
  oldValue: string
  newValue: string
  type: 'add' | 'delete' | 'modify'
}

export type QCStatus = 'pass' | 'warning' | 'fail'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface QCData {
  sampleId: string
  totalReads: number
  mappedReads: number
  mappingRate: number
  q30: number
  gcContent: number
  duplicationRate: number
  adapterContent: number
  overallStatus: QCStatus
  warnings: string[]
  contaminationLevel?: number
}

export interface CultureRecord {
  id: string
  sampleId: string
  microbeId: string
  cultureDate: string
  medium: string
  temperature: number
  incubationHours: number
  colonyCount: number
  colonyMorphology: string
  status: 'growth' | 'no-growth' | 'contaminated'
  notes: string
  recordedBy: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface ChangeHistory {
  id: string
  recordId: string
  recordType: 'culture-record' | 'sample' | 'abundance' | 'qc'
  version: number
  changedBy: string
  changeTime: string
  changeReason: string
  changes: Record<string, {
    oldValue: unknown
    newValue: unknown
  }>
}

export interface Review {
  id: string
  targetId: string
  targetType: 'sample' | 'culture-record' | 'qc'
  reviewer: string
  status: ReviewStatus
  reviewDate: string
  comments: string
  issuesFound: string[]
  recommendations: string[]
}

export interface LineageNode {
  id: string
  name: string
  type: 'sample-collection' | 'dna-extraction' | 'library-prep' | 'sequencing' | 'analysis' | 'qc'
  timestamp: string
  operator: string
  status: 'completed' | 'failed' | 'in-progress'
  notes?: string
  metadata?: Record<string, string | number>
}

export interface Lineage {
  sampleId: string
  nodes: LineageNode[]
  parentSampleId?: string
  derivationMethod?: string
}
