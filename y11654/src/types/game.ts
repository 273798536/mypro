export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended' | 'failed';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type RiskType = 'overweight' | 'wind' | 'intrusion';

export type RiskSeverity = 'warning' | 'danger';

export type CommandType = 
  | 'lift' 
  | 'lower' 
  | 'stop' 
  | 'move_left' 
  | 'move_right' 
  | 'emergency_stop'
  | 'confirm_safe'
  | 'reject_lift';

export interface CraneState {
  loadWeight: number;
  maxLoad: number;
  armAngle: number;
  hookHeight: number;
  isLifting: boolean;
  isMoving: boolean;
  targetPosition: number;
}

export interface EnvironmentState {
  windSpeed: number;
  windDirection: number;
  safeWindSpeed: number;
}

export interface RiskState {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  triggeredAt: number;
  resolved: boolean;
  resolvedAt?: number;
  responseTime?: number;
  handledCorrectly?: boolean;
}

export interface ActionRecord {
  id: string;
  timestamp: number;
  command: CommandType;
  scoreChange: number;
  reason?: string;
  roundNumber: number;
}

export interface RoundData {
  id: string;
  roundNumber: number;
  loadWeight: number;
  initialWindSpeed: number;
  completed: boolean;
  success: boolean;
  risks: RiskState[];
  actions: ActionRecord[];
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  difficulty: Difficulty;
  finalScore: number;
  success: boolean;
  failReason?: string;
  rounds: RoundData[];
  totalRounds: number;
  completedRounds: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  riskBonus: number;
  speedBonus: number;
  penalties: number;
  total: number;
}

export interface GameConfig {
  difficulty: Difficulty;
  maxRounds: number;
  baseMaxLoad: number;
  baseSafeWindSpeed: number;
  riskProbability: number;
  timeLimitPerRound: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, GameConfig> = {
  easy: {
    difficulty: 'easy',
    maxRounds: 3,
    baseMaxLoad: 1000,
    baseSafeWindSpeed: 12,
    riskProbability: 0.3,
    timeLimitPerRound: 60,
  },
  normal: {
    difficulty: 'normal',
    maxRounds: 5,
    baseMaxLoad: 800,
    baseSafeWindSpeed: 10,
    riskProbability: 0.5,
    timeLimitPerRound: 45,
  },
  hard: {
    difficulty: 'hard',
    maxRounds: 7,
    baseMaxLoad: 600,
    baseSafeWindSpeed: 8,
    riskProbability: 0.7,
    timeLimitPerRound: 30,
  },
};

export const RISK_INFO: Record<RiskType, {
  name: string;
  description: string;
  correctResponse: CommandType;
  penalty: number;
  bonus: number;
}> = {
  overweight: {
    name: '超重吊装',
    description: '吊物重量超过额定载荷',
    correctResponse: 'reject_lift',
    penalty: 50,
    bonus: 50,
  },
  wind: {
    name: '风速超限',
    description: '风速超过安全作业阈值',
    correctResponse: 'emergency_stop',
    penalty: 40,
    bonus: 40,
  },
  intrusion: {
    name: '人员闯入',
    description: '有人员闯入警戒区域',
    correctResponse: 'emergency_stop',
    penalty: 30,
    bonus: 30,
  },
};

export const COMMAND_INFO: Record<CommandType, {
  name: string;
  icon: string;
  description: string;
}> = {
  lift: {
    name: '起吊',
    icon: 'arrow-up',
    description: '开始起吊作业',
  },
  lower: {
    name: '下放',
    icon: 'arrow-down',
    description: '下放吊物',
  },
  stop: {
    name: '停止',
    icon: 'pause',
    description: '暂停当前操作',
  },
  move_left: {
    name: '左移',
    icon: 'arrow-left',
    description: '向左移动吊臂',
  },
  move_right: {
    name: '右移',
    icon: 'arrow-right',
    description: '向右移动吊臂',
  },
  emergency_stop: {
    name: '紧急停止',
    icon: 'octagon-alert',
    description: '立即停止所有作业',
  },
  confirm_safe: {
    name: '确认安全',
    icon: 'check-circle',
    description: '确认当前状态安全',
  },
  reject_lift: {
    name: '拒绝起吊',
    icon: 'x-circle',
    description: '因安全原因拒绝起吊',
  },
};
