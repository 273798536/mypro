export interface ShardNode {
  id: string;
  type: 'center' | 'primary' | 'secondary' | 'boundary';
  name: string;
  position: { x: number; y: number; z?: number };
  coordinateSystem: '2d' | '3d';
  unit: 'px' | 'cm' | 'inch';
  metadata: Record<string, unknown>;
  modelUrl?: string;
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  type: 'star' | 'mesh' | 'boundary';
  status: 'normal' | 'warning' | 'error';
  bandwidth?: number;
  latency?: number;
}

export interface ProcessRecord {
  id: string;
  timestamp: number;
  operator: string;
  operation: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'failure';
  snapshot?: string;
}

export interface AnomalyRecord {
  id: string;
  type: string;
  timestamp: number;
  context: {
    nodeIds: string[];
    modelUrl?: string;
    screenshot?: string;
  };
  handling: {
    handler: string;
    time: number;
    opinion: string;
    result: string;
  }[];
  status: 'open' | 'in_progress' | 'resolved';
}

export interface TimelineSyncRecord {
  id: string;
  initiator: string;
  timestamp: number;
  beforeState: unknown;
  afterState: unknown;
  status: 'pending' | 'success' | 'failed';
  review?: {
    reviewer: string;
    time: number;
    opinion: string;
    conclusion: string;
  };
}

export interface Level {
  id: string;
  name: string;
  description: string;
  type: 'basic' | 'boundary' | 'complex' | 'settlement';
  status: 'locked' | 'active' | 'completed' | 'failed';
  tasks: LevelTask[];
  isBoundaryFailure?: boolean;
  timeLimit?: number;
}

export interface LevelTask {
  id: string;
  description: string;
  completed: boolean;
  hints?: string[];
}

export interface ViewState {
  x: number;
  y: number;
  zoom: number;
  timestamp: number;
}

export interface SettlementData {
  levelId: string;
  passed: boolean;
  problems: string[];
  suggestions: string[];
  duration: number;
  score: number;
  completedAt: number;
}
