import type { Annotation, AnnotationType, ProcessNote } from './annotation';

export interface ReportStats {
  totalCollisions: number;
  boundaryCollisions: number;
  anomalyCount: number;
  normalAnnotations: number;
  draftCount: number;
  avgAnnotationTime: number;
}

export interface AnomalyItem {
  id: string;
  annotationId: string;
  type: AnnotationType;
  timePoint: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  annotationContent: string;
  processNotes: ProcessNote[];
}

export type TraceNodeType = 'anomaly' | 'annotation' | 'snapshot' | 'process_note';

export interface TraceNode {
  id: string;
  type: TraceNodeType;
  title: string;
  description: string;
  timestamp: number;
  linkId: string;
}

export interface Report {
  id: string;
  levelId: string;
  levelName: string;
  generatedAt: number;
  stats: ReportStats;
  anomalies: AnomalyItem[];
  annotations: Annotation[];
  plainTextExplanation: string;
  traceChain: TraceNode[];
}
