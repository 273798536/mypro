export type AnomalyType = 'none' | 'need_material' | 'need_caliber';

export type HitDetectionResult = 'pending' | 'passed' | 'failed';

export type NodeStatus = 'normal' | 'warning' | 'error';

export interface BeatNode {
  id: string;
  laneId: string;
  title: string;
  startTime: number;
  duration: number;
  status: NodeStatus;
  anomalyType: AnomalyType;
  manualNote: string;
  colorHex: string;
  colorOutOfBounds: boolean;
  colorBoundReason: string;
  hasScreenshot: boolean;
  screenshotUrl?: string;
  hitDetectionResult: HitDetectionResult;
  nextAction: string;
}

export interface Lane {
  id: string;
  name: string;
  order: number;
  nodes: BeatNode[];
}

export interface ProductionData {
  id: string;
  name: string;
  totalDuration: number;
  lanes: Lane[];
  generatedAt: string;
  mandarinExplanation: string;
}

export interface PanZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}
