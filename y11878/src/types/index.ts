export type NodeType = 'warehouse' | 'distribution' | 'demand';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  capacity: number;
  demand?: number;
  isIsolated: boolean;
  isSource?: boolean;
  isSink?: boolean;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  capacity: number;
  flow: number;
  isDisabled: boolean;
  disableNotEffective: boolean;
  utilization: number;
  isBottleneck: boolean;
}

export interface SolverStep {
  step: number;
  augmentingPath: string[];
  flowAdded: number;
  bottleneckRouteId: string;
  residualCapacities: Record<string, number>;
}

export interface AnalysisResult {
  maxFlow: number;
  totalCapacity: number;
  utilizationRate: number;
  bottleneckRoutes: Route[];
  isolatedNodes: Node[];
  zeroCapacityRoutes: Route[];
  disabledNotEffective: Route[];
  solverSteps: SolverStep[];
  routeFlows: Record<string, number>;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: number;
  nodes: Node[];
  routes: Route[];
  result: AnalysisResult;
}

export interface RouteConstraint {
  type: 'upstream' | 'downstream' | 'parallel';
  nodeId: string;
  nodeName: string;
  impact: number;
  description: string;
}

export interface PendingItem {
  id: string;
  type: 'isolated' | 'zeroCapacity' | 'disabledNotEffective';
  title: string;
  description: string;
  relatedId: string;
  resolved: boolean;
}
