export interface Node {
  id: string;
  x: number;
  y: number;
  name: string;
  elevation: number;
}

export interface Pipe {
  id: string;
  fromNode: string;
  toNode: string;
  diameter: number | null;
  length: number;
  material: string;
  sourceMaterial: string;
  sourceLine?: string;
}

export interface Valve {
  id: string;
  pipeId: string;
  name: string;
  position: number;
}

export interface ValveAction {
  id: string;
  valveId: string;
  designedTime: number;
  actualTime: number;
  action: 'open' | 'close';
  sourceMaterial: string;
  sourceLine: string;
}

export interface PressureReading {
  time: number;
  [nodeId: string]: number;
}

export type IssueType = 'valve_timing' | 'diameter_missing' | 'sensor_drift';

export interface Issue {
  id: string;
  type: IssueType;
  location: string;
  description: string;
  timePoint: number;
  deviation?: number;
  sourceMaterial: string;
  sourceLine: string;
  severity: 1 | 2 | 3;
}

export interface NetworkData {
  nodes: Node[];
  pipes: Pipe[];
  valves: Valve[];
}

export interface SimulationState {
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  duration: number;
  selectedIssueId: string | null;
  pausedForIssue: string | null;
  network: NetworkData;
  valveActions: ValveAction[];
  pressureData: PressureReading[];
  issues: Issue[];
  hoveredElement: { type: 'pipe' | 'valve' | 'node' | 'issue'; id: string } | null;
}

export interface SimulationActions {
  play: () => void;
  pause: () => void;
  setTime: (time: number) => void;
  setSpeed: (speed: number) => void;
  stepTime: (delta: number) => void;
  selectIssue: (id: string | null) => void;
  clearPausedIssue: () => void;
  setHoveredElement: (element: { type: 'pipe' | 'valve' | 'node' | 'issue'; id: string } | null) => void;
  reset: () => void;
}

export type SimulationStore = SimulationState & SimulationActions;

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  valve_timing: '阀门时间错误',
  diameter_missing: '管径缺失',
  sensor_drift: '传感器漂移',
};

export const ISSUE_TYPE_COLORS: Record<IssueType, string> = {
  valve_timing: '#dc2626',
  diameter_missing: '#dc2626',
  sensor_drift: '#f59e0b',
};
