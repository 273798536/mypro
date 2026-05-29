export interface TrainingLogEntry {
  step: number;
  loss: number;
  learningRate: number;
  params: Record<string, number>;
  valLoss?: number;
  timestamp?: number;
}

export type AnomalyType = 'missing_step' | 'loss_explosion' | 'scale_misread';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: 'warning' | 'error';
  step: number;
  position: { x: number; y: number; z: number };
  message: string;
  suggestion: string;
}

export interface ViewPreset {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  createdAt: number;
}

export interface TerrainData {
  width: number;
  height: number;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  heights: number[][];
  paramAxis: string;
  lrAxis: string;
}

export type AnnotationType = 'anomaly' | 'note' | 'checkpoint';

export interface Annotation {
  id: string;
  position: [number, number, number];
  label: string;
  type: AnnotationType;
  color: string;
}

export interface LogStoreState {
  logEntries: TrainingLogEntry[];
  anomalies: Anomaly[];
  selectedParams: string[];
  isLoading: boolean;
  loadLog: (entries: TrainingLogEntry[]) => void;
  detectAnomalies: () => void;
  selectParam: (param: string) => void;
  clearLog: () => void;
}

export interface SceneStoreState {
  terrainData: TerrainData | null;
  trainingPath: [number, number, number][];
  currentStep: number;
  isPlaying: boolean;
  annotations: Annotation[];
  showWireframe: boolean;
  useLogScale: boolean;
  setTerrainData: (data: TerrainData | null) => void;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  addAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  toggleWireframe: () => void;
  toggleLogScale: () => void;
  generateTerrain: (logEntries: TrainingLogEntry[], paramX: string, paramY: string) => void;
}

export interface ViewStoreState {
  viewPresets: ViewPreset[];
  currentViewId: string | null;
  saveView: (name: string, position: [number, number, number], target: [number, number, number]) => void;
  restoreView: (id: string) => ViewPreset | null;
  deleteView: (id: string) => void;
  exportScreenshot: () => void;
}
