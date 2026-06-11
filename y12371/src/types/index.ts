export type ScoreStatus = 'normal' | 'pending' | 'anomaly'

export type AnomalyType = 'version_mismatch' | 'annotation_override' | 'measure_misalignment'

export type AnomalyStatus = 'open' | 'confirmed' | 'resolved'

export type AnnotationStatus = 'merged' | 'conflict' | 'pending'

export type TaskType = 'annotation_merge' | 'version_check' | 'part_alignment'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Score {
  id: string
  title: string
  composer: string
  status: ScoreStatus
  pdfUrl: string
  pdfBlobDataUrl?: string
  partListUrl?: string
  exportedUrl?: string
  exportedBlobDataUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Version {
  id: string
  scoreId: string
  versionNumber: number
  pdfUrl: string
  source: string
  note?: string
  createdAt: string
}

export interface Annotation {
  id: string
  scoreId: string
  content: string
  measureRange: string
  source: string
  status: AnnotationStatus
  createdBy: string
  createdAt: string
}

export interface Part {
  id: string
  scoreId: string
  name: string
  instrument: string
  measureRange: string
  confirmed: boolean
}

export interface Anomaly {
  id: string
  scoreId: string
  type: AnomalyType
  description: string
  status: AnomalyStatus
  relatedItems: string[]
  createdAt: string
}

export interface SyncTask {
  id: string
  scoreId: string
  type: TaskType
  status: TaskStatus
  progress: number
  log: string[]
  createdAt: string
}

export interface TraceLink {
  id: string
  type: 'pdf' | 'part_list' | 'exported' | 'annotation' | 'anomaly'
  name: string
  url?: string
  timestamp: string
}

export interface FilterState {
  status: ScoreStatus | 'all'
  search: string
  dateRange: {
    start?: string
    end?: string
  }
}

export interface ScoreStore {
  scores: Score[]
  versions: Version[]
  annotations: Annotation[]
  parts: Part[]
  anomalies: Anomaly[]
  tasks: SyncTask[]
  filters: FilterState
  loading: boolean
  setScores: (scores: Score[]) => void
  setVersions: (versions: Version[]) => void
  setAnnotations: (annotations: Annotation[]) => void
  setParts: (parts: Part[]) => void
  setAnomalies: (anomalies: Anomaly[]) => void
  setTasks: (tasks: SyncTask[]) => void
  setFilters: (filters: Partial<FilterState>) => void
  addScore: (score: Score) => void
  updateScore: (id: string, score: Partial<Score>) => void
  addVersion: (version: Version) => void
  addAnnotation: (annotation: Annotation) => void
  addPart: (part: Part) => void
  addAnomaly: (anomaly: Anomaly) => void
  updateAnomalyStatus: (id: string, status: AnomalyStatus) => void
  addTask: (task: SyncTask) => void
  updateTask: (id: string, task: Partial<SyncTask>) => void
  getFilteredScores: () => Score[]
  getScoreById: (id: string) => Score | undefined
  getVersionsByScoreId: (scoreId: string) => Version[]
  getAnnotationsByScoreId: (scoreId: string) => Annotation[]
  getPartsByScoreId: (scoreId: string) => Part[]
  getAnomaliesByScoreId: (scoreId: string) => Anomaly[]
  getTasksByScoreId: (scoreId: string) => SyncTask[]
  getStats: () => {
    total: number
    normal: number
    pending: number
    anomaly: number
  }
}
