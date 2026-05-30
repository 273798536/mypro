export type ConstraintType = 'free' | 'pin' | 'roller' | 'fixed';

export type MaterialType = 'steel' | 'steel_q235' | 'steel_q345' | 'aluminum' | 'wood';

export type LevelType = 'simple-beam' | 'cantilever' | 'truss';

export type SimulationStatus = 'idle' | 'running' | 'success' | 'failed';

export type BoundaryCaseType = 'overload' | 'misalignment' | 'overbudget';

export interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  constraintType: ConstraintType;
  constraintAngle: number;
  isLoadPoint: boolean;
}

export interface Member {
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  crossSection: number;
  area: number;
  elasticModulus: number;
  yieldStrength: number;
  unitCost: number;
  material: MaterialType;
}

export interface BridgeVersion {
  id: string;
  levelId: string;
  versionNumber: number;
  parentVersionId?: string;
  name: string;
  budget: number;
  changeDescription: string;
  createdAt: string;
  createdBy: string;
  nodes: Node[];
  members: Member[];
}

export interface SimulationResult {
  id: string;
  versionId: string;
  loadStep: number;
  loadPosition: number;
  memberForces: Record<string, number>;
  memberStresses: Record<string, number>;
  reactions: Record<string, { x: number; y: number }>;
  status: SimulationStatus;
  failureReason?: string;
  failureMemberId?: string;
  error?: string;
  maxStress: number;
  maxStressMemberId: string;
  totalCost: number;
  budgetExceeded: boolean;
  timestamp: string;
}

export interface ChangeLog {
  id: string;
  versionId: string;
  field: string;
  oldValue: string;
  newValue: string;
  memberId?: string;
  description: string;
  timestamp: string;
}

export interface BoundaryCase {
  id: string;
  name: string;
  type: BoundaryCaseType;
  description: string;
  expectedResult: string;
  setup: {
    nodes?: Partial<Node>[];
    members?: Partial<Member>[];
    load?: number;
    loadNodeId?: string;
    budget?: number;
  };
}

export interface Level {
  id: string;
  name: string;
  description: string;
  type: LevelType;
  order: number;
  difficulty: 'easy' | 'medium' | 'hard';
  baseBudget: number;
  budgetLimit: number;
  defaultLoad: number;
  maxLoad: number;
  presetNodes: Node[];
  presetMembers: Member[];
  boundaryCases: BoundaryCase[];
}

export interface JudgeResult {
  passed: boolean;
  reason?: string;
  message?: string;
  memberId?: string;
  nodeId?: string;
  data?: Record<string, unknown>;
  details?: {
    overload: boolean;
    misalignment: boolean;
    overbudget: boolean;
  };
}

export interface VersionDiff {
  changedMembers: Array<{
    memberId: string;
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  budgetChange: number;
  maxStressChange: number;
  description: string;
}

export interface RenderOptions {
  showDeformation: boolean;
  deformationScale: number;
  showForces: boolean;
  showStressColors: boolean;
  showLabels: boolean;
}
