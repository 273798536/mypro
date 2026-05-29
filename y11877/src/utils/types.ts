export interface MirrorSegment {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  normalAngle?: number;
}

export interface IncidentRay {
  id: string;
  originX: number;
  originY: number;
  directionAngle: number;
  angleUnit: 'deg' | 'rad';
}

export type Verdict = 'pass' | 'error' | 'pending';

export type ConflictSource =
  | 'intersection_mismatch'
  | 'reflection_angle_deviation'
  | 'boundary_exceeded'
  | 'angle_unit_conflict'
  | 'parallel_no_intersection'
  | 'extension_line_intersection';

export type PendingAction =
  | 'verify_parallel_intent'
  | 'check_extension_validity'
  | 'confirm_angle_unit';

export interface GradingResult {
  id: string;
  rayId: string;
  mirrorId: string;
  intersection: { x: number; y: number } | null;
  isParallel: boolean;
  isOnExtension: boolean;
  isOnSegment: boolean;
  incidentAngle: number | null;
  reflectionAngle: number | null;
  angleDeviation: number | null;
  paramT: number | null;
  paramS: number | null;
  verdict: Verdict;
  conflictSources: ConflictSource[];
  pendingAction: PendingAction | null;
  computationDetails: string;
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult<T> {
  data: T[];
  errors: ParseError[];
}
