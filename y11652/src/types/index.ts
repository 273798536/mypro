export type MaterialType = 'contract' | 'invoice' | 'confidential';

export type SecurityLevel = 'public' | 'internal' | 'secret' | 'confidential' | 'top_secret';

export type RetentionPeriod = 'permanent' | '30years' | '10years';

export type CardSource = 'file_card' | 'archive_box' | 'security_tag' | 'retention_tag' | 'borrow_request' | 'archive_report';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type ErrorType = 'classification' | 'security_level' | 'retention_period' | 'borrow_not_registered';

export interface Card {
  id: string;
  source: CardSource;
  materialType: MaterialType;
  title: string;
  content: string;
  correctSecurityLevel: SecurityLevel;
  correctRetentionPeriod: RetentionPeriod;
  hasBorrowRequest: boolean;
  borrower?: string;
  borrowDate?: string;
  hints: string[];
}

export interface PlayerAction {
  cardId: string;
  timestamp: number;
  selectedType: MaterialType;
  selectedSecurityLevel: SecurityLevel;
  selectedRetentionPeriod: RetentionPeriod;
  isBorrowRegistered: boolean;
  errors: ErrorType[];
  scoreChange: number;
}

export interface GameState {
  status: 'idle' | 'playing' | 'paused' | 'finished';
  difficulty: Difficulty;
  currentCardIndex: number;
  cards: Card[];
  actions: PlayerAction[];
  score: number;
  combo: number;
  maxCombo: number;
  startTime: number | null;
  endTime: number | null;
  timeLimit: number;
  remainingTime: number;
  currentReportId: string | null;
}

export interface GameReport {
  id: string;
  startTime: number;
  endTime: number;
  difficulty: Difficulty;
  totalScore: number;
  accuracy: number;
  totalCards: number;
  correctCount: number;
  errorCount: number;
  maxCombo: number;
  errorsByType: Record<ErrorType, number>;
  actions: PlayerAction[];
  cards: Card[];
}

export interface HistoryRecord {
  id: string;
  date: number;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  duration: number;
  reportId: string;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  contract: '合同',
  invoice: '发票',
  confidential: '保密材料',
};

export const SECURITY_LEVEL_LABELS: Record<SecurityLevel, string> = {
  public: '公开',
  internal: '内部',
  secret: '秘密',
  confidential: '机密',
  top_secret: '绝密',
};

export const RETENTION_PERIOD_LABELS: Record<RetentionPeriod, string> = {
  permanent: '永久',
  '30years': '30年',
  '10years': '10年',
};

export const CARD_SOURCE_LABELS: Record<CardSource, string> = {
  file_card: '文件卡',
  archive_box: '档案盒',
  security_tag: '保密级别',
  retention_tag: '保管期限',
  borrow_request: '借阅请求',
  archive_report: '归档报告',
};

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  classification: '分类错误',
  security_level: '保密级别错误',
  retention_period: '保管期限错误',
  borrow_not_registered: '借阅未登记',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};
