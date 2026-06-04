export type TankStatus = 'normal' | 'warning' | 'error' | 'recovered';
export type TankSource = 'original' | 'supplement' | 'corrected';
export type ActionType = 'zoom' | 'pan' | 'snap' | 'tank-move' | 'scale-change' | 'recovery' | 'load-sample' | 'reset';

export interface Tank {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: TankStatus;
  remark?: string;
  source: TankSource;
  unit?: string;
  missingUnit?: boolean;
}

export interface ActionRecord {
  id: string;
  timestamp: number;
  type: ActionType;
  description: string;
  beforeValue: unknown;
  afterValue: unknown;
  operator: string;
  isError?: boolean;
  relatedTankId?: string;
}

export interface ColorRule {
  status: TankStatus;
  color: string;
  label: string;
  description: string;
  handling: string;
}

export interface CanvasState {
  scale: number;
  scaleRatio: string;
  offsetX: number;
  offsetY: number;
  gridSize: number;
  snapEnabled: boolean;
  tanks: Tank[];
  records: ActionRecord[];
  selectedTankId: string | null;
  sessionId: string;
  sessionStartTime: number;
  isPanning: boolean;
  panStartX: number;
  panStartY: number;
  dragTankId: string | null;
  dragOffsetX: number;
  dragOffsetY: number;
  previousSessions: Array<{
    sessionId: string;
    startTime: number;
    endTime: number;
    recordCount: number;
  }>;
}

export interface SampleData {
  id: string;
  name: string;
  description: string;
  tanks: Tank[];
  initialScaleRatio: string;
}

export type FriendlyMessageKey = 
  | 'missingUnit'
  | 'wrongScale'
  | 'supplementData'
  | 'correctedData'
  | 'normalData'
  | 'offlineAsset';
