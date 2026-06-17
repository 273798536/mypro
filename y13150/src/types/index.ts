export interface ExperimentObject {
  id: string;
  name: string;
  type: 'wall' | 'ceiling' | 'floor' | 'source' | 'receiver';
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  material: string;
  absorptionCoeff: number;
  color: string;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  formula: string;
}

export interface CalculationStep {
  description: string;
  formula: string;
  input: Record<string, number>;
  output: number;
  unit: string;
}

export interface MaintenanceNote {
  id: string;
  objectId: string;
  content: string;
  rawValue: string;
  unit: string;
  convertedValue: number;
  timestamp: string;
  recorder: string;
  version: number;
  parentId?: string;
}

export interface CalculationResult {
  id: string;
  noteId: string;
  paramSetId: string;
  reverbTime: number;
  unitConversions: UnitConversion[];
  intermediateSteps: CalculationStep[];
  timestamp: string;
  status: 'pending' | 'completed' | 'abnormal';
}

export interface AbnormalRecord {
  id: string;
  noteId: string;
  type: 'extreme_value' | 'unit_mismatch' | 'noise';
  reason: string;
  impactScope: string[];
  confirmed: boolean;
  confirmer?: string;
  confirmedAt?: string;
}

export interface ParameterSet {
  id: string;
  name: string;
  parameters: {
    roomVolume: number;
    totalAbsorption: number;
    temperature: number;
    humidity: number;
  };
  creator: string;
  timestamp: string;
}

export interface PageSummary {
  totalNotes: number;
  pendingConfirmations: number;
  lastCalculationTime: string;
  activeObjectId: string | null;
  selectedTimeRange: { start: number; end: number };
  quickActions: string[];
}

export interface AppState {
  objects: ExperimentObject[];
  notes: MaintenanceNote[];
  results: CalculationResult[];
  abnormalRecords: AbnormalRecord[];
  parameterSets: ParameterSet[];
  selectedObjectId: string | null;
  selectedNoteId: string | null;
  hoveredObjectId: string | null;
  currentTime: number;
  timeRange: { start: number; end: number };
  compareMode: boolean;
  selectedParamSetIds: [string | null, string | null];
  summary: PageSummary;
}

export interface AppActions {
  selectObject: (id: string | null) => void;
  selectNote: (id: string | null) => void;
  hoverObject: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setTimeRange: (range: { start: number; end: number }) => void;
  addNote: (note: Omit<MaintenanceNote, 'id' | 'timestamp' | 'version'>) => void;
  calculateReverb: (noteId: string, paramSetId: string) => CalculationResult | AbnormalRecord;
  confirmAbnormal: (recordId: string, confirmer: string) => void;
  toggleCompareMode: () => void;
  setSelectedParamSet: (index: 0 | 1, id: string | null) => void;
  loadExampleData: () => void;
  recalculateAll: () => void;
}
