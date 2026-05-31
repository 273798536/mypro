export interface BridgeNode {
  id: string;
  x: number;
  y: number;
  fixed: boolean;
  mass: number;
  remark?: string;
  version: number;
  modifiedAt: number;
  modifier: 'user' | 'system';
  displacementX?: number;
  displacementY?: number;
}

export interface BridgeMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  type: 'beam' | 'damper' | 'spring';
  stiffness: number;
  damping: number;
  maxStress: number;
  currentStress: number;
  cost: number;
}

export interface VibrationFrame {
  timestamp: number;
  windLevel: number;
  windForce: number;
  amplitude: number;
  maxStress: number;
  nodeDisplacements: { nodeId: string; dx: number; dy: number }[];
}

export type EvidenceType = 
  | 'node_modify' 
  | 'member_add' 
  | 'member_remove' 
  | 'budget_change' 
  | 'wind_level_up' 
  | 'vibration_peak' 
  | 'failure'
  | 'remark_change';

export interface EvidenceRecord {
  timestamp: number;
  type: EvidenceType;
  data: Record<string, any>;
  version: number;
  remark?: string;
}

export interface BudgetRecord {
  timestamp: number;
  action: string;
  amount: number;
  balance: number;
  remark?: string;
  version: number;
}

export type GamePhase = 'menu' | 'edit' | 'simulating' | 'paused' | 'success' | 'failed';
export type FailReason = 'resonance' | 'overload' | 'overbudget' | null;

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  totalBudget: number;
  targetWindLevel: number;
  initialNodes: Omit<BridgeNode, 'version' | 'modifiedAt' | 'modifier'>[];
  initialMembers: Omit<BridgeMember, 'currentStress'>[];
}
