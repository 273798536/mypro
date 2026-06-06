export type CellType = 'empty' | 'wall' | 'path' | 'start' | 'end' | 'item' | 'obstacle';

export interface GridCell {
  type: CellType;
  layer: number;
  content?: string;
  metadata?: Record<string, unknown>;
  note?: string;
  anomalyTag?: 'none' | 'missing' | 'fixed';
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
}

export interface Maze {
  id: string;
  name: string;
  grid: GridCell[][];
  layers: Layer[];
  score: number;
  status: 'draft' | 'completed' | 'review';
  createdAt: number;
  updatedAt: number;
  remark?: string;
}

export type OperationType = 'import' | 'edit' | 'correct' | 'confirm' | 'restore' | 'annotate';

export interface Operation {
  id: string;
  type: OperationType;
  before?: GridCell[][];
  after: GridCell[][];
  description: string;
  timestamp: number;
  affectedLayer?: string;
  scoreBefore?: number;
  scoreAfter?: number;
  annotation?: string;
}

export interface ScoreDetail {
  category: string;
  score: number;
  maxScore: number;
  reason: string;
  humanReadableReason?: string;
  issueType?: 'error' | 'warning' | 'info';
  affectedByLayer?: boolean;
}

export interface Example {
  id: string;
  title: string;
  description: string;
  source?: string;
  mazeData: Maze;
  demoSteps: DemoStep[];
  difficulty: 'easy' | 'medium' | 'hard';
  tag?: string;
}

export interface DemoStep {
  id: string;
  description: string;
  action: 'import' | 'edit' | 'error' | 'correct' | 'restore' | 'annotate';
  expectedResult: string;
  gridState?: GridCell[][];
  scoreChange?: { before: number; after: number };
  hint?: string;
}

export type MaterialStatus = 'available' | 'missing' | 'corrupted' | 'outdated';

export interface MaterialRecord {
  id: string;
  name: string;
  type: 'image' | 'sound' | 'sprite';
  status: MaterialStatus;
  path: string;
  importedAt?: number;
  errorMessage?: string;
  humanReadableError?: string;
  resolution?: string;
  fixSuggestion?: string;
  note?: string;
}

export interface ExportReport {
  mazeName: string;
  totalScore: number;
  scoreDetails: ScoreDetail[];
  operations: Operation[];
  materialIssues: MaterialRecord[];
  createdAt: number;
  changesSummary: ChangeSummary[];
  scoreHistory: ScoreSnapshot[];
}

export interface ChangeSummary {
  field: string;
  before: string;
  after: string;
  reason: string;
  humanReadable?: string;
}

export interface ScoreSnapshot {
  timestamp: number;
  totalScore: number;
  details: ScoreDetail[];
  operationDescription?: string;
}

export interface LayerOcclusionIssue {
  row: number;
  col: number;
  upperLayer: string;
  lowerLayer: string;
  description: string;
  impactOnScore: number;
}
