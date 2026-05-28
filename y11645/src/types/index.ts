export type ExitType = 
  | 'gate_A' 
  | 'gate_B' 
  | 'gate_C' 
  | 'gate_D' 
  | 'oversized' 
  | 'transfer_urgent' 
  | 'transfer_normal' 
  | 'delayed';

export type ErrorType = 
  | 'transfer_timeout' 
  | 'oversized_wrong' 
  | 'gate_wrong' 
  | 'gate_congested' 
  | 'delayed_wrong' 
  | 'none';

export interface Baggage {
  id: string;
  flightNo: string;
  destination: string;
  weight: number;
  isOversized: boolean;
  isTransfer: boolean;
  transferTime?: number;
  isDelayed: boolean;
  gate: 'A' | 'B' | 'C' | 'D';
  priority: 'normal' | 'urgent';
  generatedAt: number;
  status: 'waiting' | 'moving' | 'delivered' | 'error';
  position: number;
  selectedBelt: number | null;
}

export interface ConveyorBelt {
  id: number;
  name: string;
  targetExit: ExitType | null;
  isActive: boolean;
  speed: number;
}

export type SourceType = 'baggage_tag' | 'conveyor_belt' | 'gate_info' | 'oversized_label' | 'transfer_timer' | 'sorting_report';

export const SOURCE_LABELS: Record<SourceType, string> = {
  baggage_tag: '行李牌',
  conveyor_belt: '传送带',
  gate_info: '登机口',
  oversized_label: '超规件标签',
  transfer_timer: '转机计时器',
  sorting_report: '分拣报告',
};

export interface CorrectionEntry {
  timestamp: number;
  field: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
  reason: string;
  source: SourceType;
}

export interface ActionRecord {
  timestamp: number;
  baggageId: string;
  flightNo: string;
  selectedExit: ExitType;
  correctExit: ExitType;
  errorType: ErrorType;
  scoreChange: number;
  responseTime: number;
  source: SourceType;
  correctionTrail: CorrectionEntry[];
  baggageInfo: Pick<Baggage, 'weight' | 'isTransfer' | 'transferTime' | 'isDelayed' | 'gate' | 'destination'>;
}

export interface GameRecord {
  id: string;
  levelId: number;
  levelName: string;
  startTime: number;
  endTime: number;
  totalScore: number;
  accuracy: number;
  totalBaggage: number;
  correctCount: number;
  errorCount: number;
  maxCombo: number;
  avgResponseTime: number;
  actions: ActionRecord[];
  errors: ActionRecord[];
  starRating: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  duration: number;
  baggageCount: number;
  spawnInterval: number;
  focusAreas: string[];
  unlocked: boolean;
  config: {
    oversizedRate: number;
    transferRate: number;
    delayedRate: number;
    urgentTransferRate: number;
  };
}

export interface GateTraffic {
  exit: ExitType;
  timestamps: number[];
}

export interface GameState {
  currentPage: 'home' | 'game' | 'result' | 'history' | 'replay';
  gameStatus: 'idle' | 'playing' | 'paused' | 'finished';
  currentLevel: LevelConfig | null;
  currentRecordId: string | null;
  
  timeRemaining: number;
  score: number;
  combo: number;
  maxCombo: number;
  currentBaggage: Baggage[];
  conveyorBelts: ConveyorBelt[];
  gateTraffic: GateTraffic[];
  actions: ActionRecord[];
  currentErrors: ActionRecord[];
  activeError: ActionRecord | null;
  
  gameHistory: GameRecord[];
  bestScores: Record<number, number>;
  unlockedLevels: number[];
  
  isReplaying: boolean;
  replayData: GameRecord | null;
  replayTime: number;
  replayActions: ActionRecord[];
  
  setPage: (page: GameState['currentPage']) => void;
  startGame: (levelId: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  assignBaggage: (baggageId: string, exitType: ExitType) => void;
  switchConveyor: (beltId: number, target: ExitType) => void;
  spawnBaggage: () => void;
  updateBaggagePositions: (deltaTime: number) => void;
  dismissError: () => void;
  clearHistory: () => void;
  exportReport: (recordId: string, format: 'csv' | 'pdf' | 'xlsx') => void;
  startReplay: (recordId: string) => void;
  updateReplayTime: (time: number) => void;
  loadFromStorage: () => void;
}

export const EXIT_LABELS: Record<ExitType, string> = {
  gate_A: '登机口 A',
  gate_B: '登机口 B',
  gate_C: '登机口 C',
  gate_D: '登机口 D',
  oversized: '超规通道',
  transfer_urgent: '加急转机',
  transfer_normal: '普通转机',
  delayed: '延误通道',
};

export const ERROR_MESSAGES: Record<Exclude<ErrorType, 'none'>, { title: string; description: string; penalty: number }> = {
  transfer_timeout: {
    title: '⚠️ 转机超时风险',
    description: '该行李转机时间不足30分钟，应走加急转机通道！',
    penalty: 10,
  },
  oversized_wrong: {
    title: '⚠️ 超规件错分',
    description: '该行李为超规件，应送往超规通道！',
    penalty: 15,
  },
  gate_wrong: {
    title: '⚠️ 登机口错误',
    description: '航班对应登机口不匹配！',
    penalty: 10,
  },
  gate_congested: {
    title: '⚠️ 登机口拥堵',
    description: '该登机口已积压，请分流到其他通道！',
    penalty: 5,
  },
  delayed_wrong: {
    title: '⚠️ 延误航班未处理',
    description: '该航班已延误，应送往延误通道！',
    penalty: 10,
  },
};
