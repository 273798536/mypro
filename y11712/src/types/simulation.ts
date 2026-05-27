export interface SimulationParams {
  plateLength: number;
  plateWidth: number;
  thermalConductivity: number;
  specificHeat: number;
  density: number;
  gridStepX: number;
  gridStepY: number;
  timeStep: number;
  totalTime: number;
  boundaryTempTop: number;
  boundaryTempBottom: number;
  boundaryTempLeft: number;
  boundaryTempRight: number;
  initialTemp: number;
  materialName: string;
  source: string;
}

export interface GridSize {
  nx: number;
  ny: number;
  nt: number;
}

export interface StabilityResult {
  isStable: boolean;
  alpha: number;
  rx: number;
  ry: number;
  stabilityNumber: number;
  maxStableTimeStep: number;
  warnings: WarningItem[];
  errors: ErrorItem[];
}

export interface WarningItem {
  id: string;
  type: 'stability' | 'grid' | 'boundary' | 'precision';
  message: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction?: string;
}

export interface ErrorItem {
  id: string;
  type: 'invalid_param' | 'boundary_conflict' | 'unstable' | 'computation';
  message: string;
  detail: string;
}

export interface CorrectionLog {
  id: string;
  paramId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  reason: string;
  source: string;
  correctedAt: string;
}

export interface Preset {
  id: string;
  name: string;
  params: SimulationParams;
  source: string;
  savedAt: string;
}

export interface SimulationResult {
  temperatureField: number[][][];
  params: SimulationParams;
  grid: GridSize;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
}

export interface ReportSection {
  type: 'untouched' | 'corrected' | 'needs_confirmation';
  title: string;
  items: ReportItem[];
}

export interface ReportItem {
  name: string;
  value: string;
  description: string;
}

export interface ReportData {
  simulationId: string;
  generatedAt: string;
  params: SimulationParams;
  grid: GridSize;
  stability: StabilityResult;
  resultSummary: {
    maxTemp: number;
    minTemp: number;
    avgTemp: number;
    finalMaxGradient: number;
  };
  sections: ReportSection[];
  correctionLogs: CorrectionLog[];
}

export interface PointInfo {
  x: number;
  y: number;
  temperature: number;
  gradX: number;
  gradY: number;
  gradientMagnitude: number;
}
