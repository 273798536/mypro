export type Point3D = [number, number, number];

export interface RiverSection {
  id: string;
  name: string;
  chainage: number;
  coordinates: [number, number, number][];
  notes?: string;
  elevation: number;
}

export interface FlowData {
  id: string;
  sectionId: string;
  timestamp: number;
  flow: number;
  waterLevel: number;
  source?: string;
}

export interface SedimentData {
  id: string;
  sectionId: string;
  timestamp: number;
  concentration: number;
  particleSize: number;
  delayHours: number;
}

export interface CalculationParams {
  flowMultiplier: number;
  sedimentMultiplier: number;
  erosionCoefficient: number;
  depositionCoefficient: number;
  timeStep: number;
}

export interface CalculationResult {
  sectionElevations: Record<string, number[]>;
  erosionVolume: number;
  depositionVolume: number;
  sedimentTransport: number[];
  timestamps: number[];
  bedChanges: Record<string, number[]>;
}

export type IssueType = 'missing_section' | 'flow_mutation' | 'coordinate_misalignment' | 'missing_field' | 'delayed_data';

export interface DataQualityIssue {
  id: string;
  type: IssueType;
  sectionId?: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  ignored: boolean;
  fixData?: Record<string, any>;
}

export interface PlanSnapshot {
  id: string;
  name: string;
  createdAt: number;
  parameters: CalculationParams;
  resultData: CalculationResult;
  flowData: FlowData[];
  parentId?: string;
}

export interface TimeInfo {
  currentTime: number;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  currentIndex: number;
}

export interface AppState {
  sections: RiverSection[];
  flowData: FlowData[];
  sedimentData: SedimentData[];
  issues: DataQualityIssue[];
  time: TimeInfo;
  params: CalculationParams;
  currentPlan: PlanSnapshot | null;
  comparePlan: PlanSnapshot | null;
  planHistory: PlanSnapshot[];
  selectedSectionId: string | null;
  viewMode: '3d' | 'compare' | 'chart';
  calculationResult: CalculationResult | null;
  isCalculating: boolean;
}

export interface AppActions {
  setParams: (params: Partial<CalculationParams>) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  validateData: () => void;
  savePlan: (name: string) => void;
  loadPlan: (planId: string, forCompare?: boolean) => void;
  deletePlan: (planId: string) => void;
  ignoreIssue: (issueId: string) => void;
  fixIssue: (issueId: string, fixData: Record<string, any>) => void;
  selectSection: (sectionId: string | null) => void;
  setViewMode: (mode: '3d' | 'compare' | 'chart') => void;
  updateFlowData: (index: number, newFlow: number) => void;
  recalculate: () => void;
  setPlaying: (playing: boolean) => void;
}

export type AppStore = AppState & AppActions;

export interface ErosionPoint {
  chainage: number;
  elevation: number;
  change: number;
  sectionName: string;
}

export interface TimeSeriesPoint {
  time: number;
  flow: number;
  sediment: number;
  erosion: number;
  deposition: number;
}

export const DEFAULT_PARAMS: CalculationParams = {
  flowMultiplier: 1.0,
  sedimentMultiplier: 1.0,
  erosionCoefficient: 0.05,
  depositionCoefficient: 0.03,
  timeStep: 1,
};

export const COLORS = {
  primary: '#0EA5E9',
  secondary: '#0F172A',
  erosion: '#EF4444',
  deposition: '#10B981',
  warning: '#F97316',
  neutral: '#64748B',
  grid: '#1E293B',
  water: 'rgba(14, 165, 233, 0.3)',
};
