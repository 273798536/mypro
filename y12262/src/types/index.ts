export type NodeType = 'account' | 'device' | 'address';

export type RiskLevel = 'unknown' | 'safe' | 'suspicious' | 'blacklist';

export type MaterialSource = 'bank' | 'police' | 'telco' | 'merchant' | 'internal';

export type MaterialType = 'account-card' | 'address-clue' | 'risk-tag';

export type FalsePositiveType = 'device-sharing' | 'chain-too-long' | 'tag-lag';

export type GameStatus = 'playing' | 'completed' | 'failed';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type FocusPoint = 'chain-length' | 'device-sharing' | 'tag-lag';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  x: number;
  y: number;
  trueRiskLevel: RiskLevel;
  falsePositiveType?: FalsePositiveType;
  falsePositiveReason?: string;
  tagLagInfo?: {
    oldTag: RiskLevel;
    newTag: RiskLevel;
    updateTime: string;
    evidence: string;
  };
  chainLength?: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: 'uses-device' | 'resides-at' | 'related-account' | 'transacts-with';
  relationStrength: number;
}

export interface Material {
  id: string;
  source: MaterialSource;
  type: MaterialType;
  content: string;
  timestamp: string;
  targetNodeId: string;
}

export interface Operation {
  id: string;
  nodeId: string;
  action: 'mark-safe' | 'mark-suspicious' | 'mark-blacklist';
  oldValue: RiskLevel;
  newValue: RiskLevel;
  timestamp: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface Level {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  focusPoint: FocusPoint;
  maxMistakes: number;
  backgroundStory: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  materials: Material[];
}

export interface GameState {
  levelId: string;
  status: GameStatus;
  mistakes: number;
  nodeStates: Record<string, RiskLevel>;
  operations: Operation[];
  startTime: string;
  endTime?: string;
}

export interface GameStateWithHistory {
  past: GameState[];
  present: GameState;
  future: GameState[];
}

export interface FalsePositiveItem {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  playerMark: RiskLevel;
  correctMark: RiskLevel;
  reason: string;
  evidence: string;
}

export interface ChainLengthIssue {
  chain: string[];
  chainLength: number;
  description: string;
  suggestion: string;
}

export interface TagLagIssue {
  nodeId: string;
  nodeName: string;
  oldTag: RiskLevel;
  newTag: RiskLevel;
  timeDiff: string;
  impact: string;
}

export interface RiskReport {
  levelId: string;
  levelTitle: string;
  generateTime: string;
  totalNodes: number;
  blacklistCount: number;
  safeCount: number;
  suspiciousCount: number;
  falsePositives: FalsePositiveItem[];
  chainLengthIssues: ChainLengthIssue[];
  tagLagIssues: TagLagIssue[];
  playerOperations: Operation[];
  accuracyRate: number;
  trainingPoints: string[];
}

export type GameAction =
  | { type: 'MARK_NODE'; nodeId: string; level: RiskLevel }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SUBMIT' }
  | { type: 'RESET' }
  | { type: 'JUMP_TO_STEP'; stepIndex: number };
