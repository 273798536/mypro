export type ItemType = 'return' | 'damaged' | 'reserved' | 'normal';

export type TargetArea = 'return' | 'damaged' | 'reserved' | 'shelf-A' | 'shelf-B' | 'shelf-C';

export type ErrorType = 'reserved_return' | 'damaged_unregistered' | 'shelf_mismatch' | 'return_mismatch';

export type BookCategory = '文学' | '科技' | '艺术' | '历史' | '教育';

export interface BookItem {
  id: string;
  title: string;
  type: ItemType;
  category: BookCategory;
  isDamaged: boolean;
  isReserved: boolean;
  reservedBy?: string;
  damageDescription?: string;
  correctTarget: TargetArea;
  coverColor: string;
}

export interface GameLevel {
  id: number;
  name: string;
  itemCount: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export interface GameAction {
  itemId: string;
  itemTitle: string;
  target: TargetArea;
  correctTarget: TargetArea;
  isCorrect: boolean;
  errorType?: ErrorType;
  points: number;
  timestamp: number;
}

export interface GameRecord {
  id: string;
  levelId: number;
  levelName: string;
  score: number;
  totalItems: number;
  correctCount: number;
  errorCount: number;
  actions: GameAction[];
  startTime: string;
  endTime: string;
  duration: number;
}

export interface GameState {
  currentLevel: GameLevel | null;
  items: BookItem[];
  processedItems: Set<string>;
  score: number;
  timeRemaining: number;
  actions: GameAction[];
  status: 'idle' | 'playing' | 'paused' | 'completed';
  currentRecordId: string | null;
}

export interface ValidationResult {
  isCorrect: boolean;
  errorType?: ErrorType;
  points: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
}

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  reserved_return: '预订书误退',
  damaged_unregistered: '破损未登记',
  shelf_mismatch: '货架错位',
  return_mismatch: '退货区错位',
};

export const ERROR_POINTS: Record<ErrorType, number> = {
  reserved_return: -15,
  damaged_unregistered: -10,
  shelf_mismatch: -8,
  return_mismatch: -5,
};

export const TARGET_AREA_LABELS: Record<TargetArea, string> = {
  return: '退货区',
  damaged: '破损登记区',
  reserved: '预订保留区',
  'shelf-A': '文学书架',
  'shelf-B': '科技书架',
  'shelf-C': '艺术书架',
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  return: '退货书',
  damaged: '破损书',
  reserved: '预订书',
  normal: '正常销售书',
};

export const SHELF_CATEGORIES: Record<string, BookCategory> = {
  'shelf-A': '文学',
  'shelf-B': '科技',
  'shelf-C': '艺术',
};
