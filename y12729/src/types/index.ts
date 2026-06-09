export type SampleStatus = 'normal' | 'pending' | 'bad_data';
export type ReviewStatus = 'approved' | 'rejected' | 'pending_review';

export interface FlowNode {
  id: string;
  label: string;
  capacity: number;
  flow: number;
  isBottleneck?: boolean;
  x: number;
  y: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  capacity: number;
  flow: number;
  isBottleneck?: boolean;
}

export interface DuplicatePair {
  sampleId1: string;
  sampleId2: string;
  similarityScore: number;
  reason: string;
}

export interface BottleneckExplanation {
  summary: string;
  teachingNote: string;
  affectedNodes: string[];
  affectedEdges: string[];
  maxFlow: number;
  bottleneckValue: number;
}

export interface DataIssue {
  type: 'disconnected' | 'negative_capacity' | 'self_loop' | 'unreachable_sink' | 'missing_data' | 'abnormal_value';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface AnalysisSample {
  id: string;
  name: string;
  status: SampleStatus;
  nodes: FlowNode[];
  edges: FlowEdge[];
  source: string;
  sink: string;
  explanation: BottleneckExplanation | null;
  issues: DataIssue[];
  isDuplicate: boolean;
  duplicateOf?: string;
  duplicatePair?: DuplicatePair;
  reviewed: boolean;
  reviewStatus?: ReviewStatus;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftData {
  id: string;
  sampleId: string;
  sampleName: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  arrivedAt: string;
  impacts: string[];
  diffSummary: string;
}

export interface ExportReport {
  generatedAt: string;
  samples: AnalysisSample[];
  duplicates: DuplicatePair[];
  summary: {
    total: number;
    normal: number;
    pending: number;
    badData: number;
    duplicates: number;
  };
}

export interface FilterState {
  status: SampleStatus | 'all';
  onlyDuplicates: boolean;
  onlyReviewed: boolean | 'all';
  search: string;
}
