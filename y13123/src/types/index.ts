export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isAbnormal?: boolean;
  onShortestPath?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  onShortestPath?: boolean;
}

export type ProblemUnit = 'km' | 'm' | '';

export interface Problem {
  id: string;
  start: string;
  end: string;
  distance: number | null;
  unit: ProblemUnit;
  remark?: string;
}

export interface ParamVersion {
  version: string;
  timestamp: string;
  algorithm: 'Dijkstra' | 'Floyd';
  nodeCount: number;
  edgeCount: number;
  weightRule: string;
  operator: string;
}

export interface AbnormalPoint {
  nodeId: string;
  problemId: string;
  description: string;
  severity: 'warn' | 'error';
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  operator: string;
  field: string;
  before: string;
  after: string;
  reason?: string;
}

export interface WithdrawnItem {
  id: string;
  title: string;
  withdrawnAt: string;
  operator: string;
  reason: string;
}

export interface AddendumNote {
  id: string;
  content: string;
  author: string;
  addedAt: string;
}

export type MaterialCheckItem = {
  key: string;
  label: string;
  ok: boolean;
  hint?: string;
};
