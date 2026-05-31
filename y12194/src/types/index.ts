export type NoteType = 'tap' | 'hold' | 'slide' | 'touch';

export type BadLineType = 'empty' | 'comment' | 'missing_column' | 'invalid_format';

export type IssueType = 'timing_offset' | 'dense_chord' | 'hold_miss' | 'difficulty_label';

export type Severity = 'critical' | 'warning' | 'info';

export type TraceNodeType = 'parse' | 'align' | 'analyze' | 'result';

export type TraceStatus = 'success' | 'warning' | 'error';

export interface ChartNote {
  id: string;
  time: number;
  type: NoteType;
  position: number;
  duration?: number;
  column: number;
  rawLine?: string;
}

export interface BadLine {
  lineNumber: number;
  content: string;
  type: BadLineType;
  reason: string;
  fixed?: boolean;
  fixHistory?: FixRecord[];
}

export interface FixRecord {
  id: string;
  timestamp: number;
  operator: string;
  originalContent: string;
  newContent: string;
  reason: string;
}

export interface QualityIssue {
  id: string;
  type: IssueType;
  severity: Severity;
  time: number;
  description: string;
  relatedNotes: string[];
  traceId: string;
  rawData: Record<string, any>;
}

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  name: string;
  status: TraceStatus;
  data: Record<string, any>;
  timestamp: number;
  parentId?: string;
}

export interface ChartProject {
  id: string;
  name: string;
  difficulty: string;
  fileName: string;
  rawContent: string;
  notes: ChartNote[];
  badLines: BadLine[];
  issues: QualityIssue[];
  traceGraph: TraceNode[];
  createdAt: number;
  updatedAt: number;
}

export interface QualityReport {
  projectId: string;
  generatedAt: number;
  totalNotes: number;
  issuesCount: {
    critical: number;
    warning: number;
    info: number;
  };
  timingOffsetIssues: QualityIssue[];
  otherIssues: QualityIssue[];
  statistics: {
    noteDensity: number;
    averageInterval: number;
    difficultyScore: number;
  };
}

export interface ParseResult {
  notes: ChartNote[];
  badLines: BadLine[];
  traceNodes: TraceNode[];
  difficulty: string;
}

export interface AnalysisConfig {
  denseChordThreshold: number;
  timingOffsetThreshold: number;
  minHoldDuration: number;
}
