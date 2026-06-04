export type RecordStatus = 'success' | 'pending' | 'error' | 'flipped';

export type GamePhase = 'idle' | 'playing' | 'paused' | 'finished';

export type UserRole = 'teacher' | 'student';

export interface Point {
  x: number;
  y: number;
}

export interface SourceMeta {
  originalRow: number;
  imageName: string;
  remark: string;
  dataSource: string;
}

export interface InspectionRecord {
  id: string;
  name: string;
  status: RecordStatus;
  actualCoords: Point;
  displayedCoords: Point;
  isFlipped: boolean;
  trajectory: Point[];
  sourceMeta: SourceMeta;
  hint: string;
}

export interface AnnotationResult {
  recordId: string;
  userClick: Point;
  distance: number;
  isHit: boolean;
  hitThreshold: number;
  score: number;
  timestamp: number;
}

export interface GameState {
  phase: GamePhase;
  currentRecordIndex: number;
  records: InspectionRecord[];
  results: AnnotationResult[];
  startTime: number | null;
  elapsedTime: number;
  isPaused: boolean;
}

export type GameAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'ANNOTATE'; payload: AnnotationResult }
  | { type: 'NEXT_RECORD' }
  | { type: 'FINISH' }
  | { type: 'TICK' };

export interface GameStats {
  totalRecords: number;
  completedRecords: number;
  hits: number;
  misses: number;
  pendingCount: number;
  errorCount: number;
  flippedCount: number;
  totalScore: number;
  averageDistance: number;
}

export interface ReviewExport {
  exportTime: string;
  gameDuration: number;
  totalScore: number;
  hitRate: number;
  records: Array<{
    record: InspectionRecord;
    result: AnnotationResult | null;
    dataStatus: 'direct_use' | 'needs_review' | 'bad_data';
  }>;
}
