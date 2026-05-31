export type Axis = 'x' | 'y';

export type StepType = 'function_confirm' | 'axis_selection' | 'interval_setting' | 'slice_count' | 'simulation_trigger';

export type AnomalyType = 'axis_confusion' | 'interval_reverse' | 'insufficient_slices';

export type GamePhase = 'function' | 'axis' | 'interval' | 'slice' | 'simulation' | 'result';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface GameFunction {
  expr: string;
  correctAxis: Axis;
  correctInterval: [number, number];
  correctVolume: number;
  displayName: string;
}

export interface PlayerInput {
  selectedAxis?: Axis;
  interval?: [number, number];
  sliceCount?: number;
}

export interface Step {
  id: string;
  timestamp: number;
  type: StepType;
  value: any;
  scoreImpact: number;
  description: string;
  isSimulationTrigger: boolean;
}

export interface Anomaly {
  id: string;
  stepId: string;
  type: AnomalyType;
  description: string;
  penalty: number;
  resolved: boolean;
}

export interface GameResult {
  totalScore: number;
  breakdown: {
    axisScore: number;
    intervalScore: number;
    sliceScore: number;
    accuracyScore: number;
  };
  calculatedVolume: number;
  errorPercentage: number;
  grade: Grade;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  gameFunction: GameFunction;
  playerInput: PlayerInput;
  steps: Step[];
  anomalies: Anomaly[];
  result?: GameResult;
  status: 'playing' | 'completed';
  currentPhase: GamePhase;
}

export interface GameState {
  currentSession: GameSession | null;
  history: GameSession[];
  startNewGame: (customFunction?: GameFunction) => void;
  confirmFunction: () => void;
  selectAxis: (axis: Axis) => void;
  setInterval: (start: number, end: number) => void;
  setSliceCount: (count: number) => void;
  triggerSimulation: () => void;
  completeGame: () => void;
  resetGame: () => void;
  loadSession: (session: GameSession) => void;
}

export interface SliceData {
  index: number;
  x: number;
  radius: number;
  volume: number;
  thickness: number;
}

export const ANOMALY_PENALTIES: Record<AnomalyType, number> = {
  axis_confusion: -20,
  interval_reverse: -15,
  insufficient_slices: -10,
};

export const ANOMALY_DESCRIPTIONS: Record<AnomalyType, (selected: any, correct?: any) => string> = {
  axis_confusion: (selected, correct) => 
    `⚠️ 轴线混淆：你选择了${selected.toUpperCase()}轴，但应该绕${correct.toUpperCase()}轴旋转`,
  interval_reverse: (selected, correct) =>
    `⚠️ 区间反向：积分上限(${selected[1]})小于下限(${selected[0]})，正确区间应为 [${correct?.[0]}, ${correct?.[1]}]`,
  insufficient_slices: (selected) =>
    `⚠️ 切片过少：仅${selected}片会导致较大误差，建议至少10片`,
};

export const SAMPLE_FUNCTIONS: GameFunction[] = [
  {
    expr: 'x^2',
    correctAxis: 'x',
    correctInterval: [0, 2],
    correctVolume: Math.PI * 6.4,
    displayName: 'f(x) = x²',
  },
  {
    expr: 'sqrt(x)',
    correctAxis: 'x',
    correctInterval: [0, 4],
    correctVolume: Math.PI * 8,
    displayName: 'f(x) = √x',
  },
  {
    expr: 'sin(x)',
    correctAxis: 'x',
    correctInterval: [0, Math.PI],
    correctVolume: Math.PI * Math.PI / 2,
    displayName: 'f(x) = sin(x)',
  },
  {
    expr: 'exp(-x)',
    correctAxis: 'y',
    correctInterval: [0, 1],
    correctVolume: Math.PI * (1 - Math.exp(-2)) / 2,
    displayName: 'f(x) = e^(-x)',
  },
  {
    expr: '1/x',
    correctAxis: 'x',
    correctInterval: [1, 2],
    correctVolume: Math.PI * 0.5,
    displayName: 'f(x) = 1/x',
  },
];
