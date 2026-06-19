export type {
  MetricValue,
  EvaluationResult,
  HumanCorrection,
  EvaluationFilter,
  EvaluationStatistics,
  MetricSummary,
  EvaluationListResponse,
  MetricDiff,
  SampleChangeDetail,
  SampleChanges,
  ThresholdChange,
  CorrectionModification,
  CorrectionDiff,
  VersionComparison,
  ThresholdConfig,
  VersionSnapshot,
} from "../../../shared/types"

export interface AppState {
  filter: EvaluationFilter
  setFilter: (filter: Partial<EvaluationFilter>) => void
  resetFilter: () => void
  selectedVersion: string
  setSelectedVersion: (v: string) => void
  compareVersions: { previous: string; current: string }
  setCompareVersions: (v: { previous: string; current: string }) => void
}
