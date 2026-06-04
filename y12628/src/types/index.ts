export type StickerType = 'acid' | 'flammable' | 'toxic' | 'oxidizer' | 'corrosive' | 'explosive';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export type ActionType = 'create' | 'move' | 'flip' | 'delete' | 'import';

export type MergeStrategy = 'overwrite' | 'skip' | 'new_version';

export interface Sticker {
  id: string;
  type: StickerType;
  label: string;
  color: string;
  x: number;
  y: number;
  flipped: boolean;
  originalX: number;
  originalY: number;
  createdAt: number;
  updatedAt: number;
  sourceId?: string;
  verified: boolean;
}

export interface ActionLog {
  id: string;
  type: ActionType;
  stickerId: string;
  before: Partial<Sticker>;
  after: Partial<Sticker>;
  timestamp: number;
  operator: string;
  source?: string;
  description: string;
}

export interface ColorRule {
  id: string;
  stickerType: StickerType;
  requiredColors: string[];
  flipColorMap?: Record<string, string>;
}

export interface TraceStep {
  actionId: string;
  description: string;
  timestamp: number;
  details: Record<string, unknown>;
}

export interface TraceChain {
  resultId: string;
  steps: TraceStep[];
  sourceData: Record<string, unknown>;
}

export interface GameState {
  status: GameStatus;
  startTime: number | null;
  elapsedTime: number;
  progress: number;
  totalStickers: number;
  placedStickers: number;
}

export interface AppError {
  id: string;
  type: 'flip_error' | 'color_missing' | 'duplicate' | 'validation';
  message: string;
  actionable: string;
  timestamp: number;
  stickerId?: string;
}

export interface DuplicateInfo {
  existingId: string;
  newData: Partial<Sticker>;
  differences: string[];
}

export interface ExportSummary {
  totalStickers: number;
  verifiedCount: number;
  pendingCount: number;
  errorCount: number;
  status: '通过' | '待确认' | '有错误';
  exportTime: number;
}
