export interface BridgeNode {
  id: string;
  x: number;
  y: number;
  type: 'deck' | 'support' | 'free';
  isFixed: boolean;
  reactionForce?: { fx: number; fy: number };
  isStable?: boolean;
  instabilityReason?: string;
}

export interface BridgeMember {
  id: string;
  nodeAId: string;
  nodeBId: string;
  materialType: MaterialType;
  crossSection: number;
  internalForce: number;
  allowableStress: number;
  stressRatio: number;
  overloadReason?: string;
}

export type MaterialType = 'steel' | 'aluminum' | 'wood';

export interface MaterialProps {
  name: string;
  nameZh: string;
  elasticModulus: number;
  allowableStress: number;
  unitCost: number;
}

export const MATERIALS: Record<MaterialType, MaterialProps> = {
  steel: {
    name: 'Steel',
    nameZh: '钢材',
    elasticModulus: 20000,
    allowableStress: 25,
    unitCost: 100,
  },
  aluminum: {
    name: 'Aluminum',
    nameZh: '铝材',
    elasticModulus: 7000,
    allowableStress: 17,
    unitCost: 70,
  },
  wood: {
    name: 'Wood',
    nameZh: '木材',
    elasticModulus: 1200,
    allowableStress: 4,
    unitCost: 30,
  },
};

export interface ActionRecord {
  timestamp: number;
  type: ActionType;
  payload: unknown;
  resultingScore: number;
  structuralImpact?: string;
}

export type ActionType =
  | 'ADD_NODE'
  | 'MOVE_NODE'
  | 'REMOVE_NODE'
  | 'ADD_MEMBER'
  | 'REMOVE_MEMBER'
  | 'MERGE_RESOLVE'
  | 'LOAD_TEST'
  | 'MATERIAL_CHANGE';

export interface DiffEntry {
  type: 'added' | 'removed' | 'modified';
  entityType: 'node' | 'member';
  entityId: string;
  field: string;
  currentSideValue: unknown;
  incomingSideValue: unknown;
  description: string;
}

export interface MergeSnapshot {
  timestamp: number;
  diffs: DiffEntry[];
  resolution: Record<string, 'current' | 'incoming'>;
}

export interface TestResult {
  vehicleCompleted: boolean;
  overloadedMemberIds: string[];
  failedMemberIds: string[];
  maxDeflection: number;
  structuralIntegrityScore: number;
  budgetEfficiencyScore: number;
  totalScore: number;
  overloadEvents: OverloadEvent[];
}

export interface OverloadEvent {
  memberIds: string[];
  vehiclePosition: number;
  forces: Record<string, number>;
  reasons: Record<string, string>;
}

export type GamePhase = 'building' | 'testing' | 'review';

export type BuildTool = 'addNode' | 'addMember' | 'select' | 'delete' | 'addSupport';

export type NodeEditMode = 'node' | 'member';

export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  gridSize: number;
  budget: number;
  vehicleLoad: number;
  defaultCrossSection: number;
  leftSupportX: number;
  rightSupportX: number;
  supportY: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 28,
  gridHeight: 16,
  gridSize: 40,
  budget: 2000,
  vehicleLoad: 50,
  defaultCrossSection: 5,
  leftSupportX: 3,
  rightSupportX: 25,
  supportY: 12,
};
