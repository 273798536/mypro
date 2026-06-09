export type RecordStatus = 'ready' | 'needs_review' | 'invalid';
export type DataQuality = 'normal' | 'null' | 'duplicate' | 'note_inline' | 'outlier';
export type CalculationMethod = 'normalization' | 'external_standard' | 'internal_standard';

export interface Peak {
  id: string;
  recordId: string;
  peakIndex: number;
  compoundName?: string;
  retentionTime: number | null;
  peakArea: number | null;
  peakHeight: number | null;
  theoreticalPlates: number | null;
  note?: string;
  dataQuality: DataQuality;
  isDuplicate: boolean;
  isNull: boolean;
  inlineNote?: string;
}

export interface AlignmentStep {
  id: string;
  recordId: string;
  stepOrder: number;
  stepName: string;
  description: string;
  explanation: string;
  isCompleted: boolean;
  parameters?: Record<string, unknown>;
}

export interface CalculationResult {
  id: string;
  recordId: string;
  method: CalculationMethod;
  formula: string;
  intermediateValues: { label: string; value: number; unit?: string }[];
  components: { name: string; area: number; percentage: number }[];
  totalPercentage: number;
  finalResult: number;
  unit: string;
  note?: string;
}

export interface OperationLog {
  id: string;
  recordId: string;
  operator: string;
  actionType: 'create' | 'edit' | 'update_status' | 'import' | 'recalculate' | 'export';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  timestamp: string;
}

export interface ChromatogramParams {
  column?: string;
  carrierGas?: string;
  flowRate?: number;
  temperatureProgram?: string;
  injectionVolume?: string;
  detector?: string;
}

export interface GCRecord {
  id: string;
  batchNumber: string;
  sampleName: string;
  injectionTime: string;
  instrumentModel: string;
  operator: string;
  status: RecordStatus;
  conclusion: string;
  conclusionSource: string;
  chromatogramParams: ChromatogramParams;
  peaks: Peak[];
  alignmentSteps: AlignmentStep[];
  calculationResult?: CalculationResult;
  operationLogs: OperationLog[];
  createdAt: string;
  updatedAt: string;
}

export interface UiState {
  currentRole: 'safety_officer' | 'researcher' | 'guest';
  sidebarCollapsed: boolean;
  searchQuery: string;
  filterStatus: RecordStatus | 'all';
  dateRange: { start?: string; end?: string } | null;
}

export type { GCRecord as default };
