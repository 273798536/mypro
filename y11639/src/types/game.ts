export type SkillType = 'line_repair' | 'transformer' | 'cable' | 'substation';

export type TeamStatus = 'idle' | 'executing' | 'cooling';

export type AreaType = 'hospital' | 'residential' | 'commercial' | 'industrial';

export type PowerStatus = 'normal' | 'damaged' | 'blackout';

export type WeatherType = 'typhoon' | 'rainstorm' | 'lightning' | 'normal' | 'fog';

export type LogType = 'dispatch' | 'recall' | 'weather' | 'error' | 'system' | 'score';

export type LogLevel = 'info' | 'warning' | 'error' | 'success';

export type FailType = 'timeout' | 'duplicate_dispatch' | 'spare_parts_insufficient' | 'skill_mismatch' | 'team_cooling' | 'other';

export interface RepairTeam {
  id: string;
  name: string;
  skills: SkillType[];
  status: TeamStatus;
  cooldown: number;
  currentTarget: string | null;
  executeRounds: number;
}

export interface Area {
  id: string;
  name: string;
  type: AreaType;
  priority: number;
  powerStatus: PowerStatus;
  timeoutRounds: number;
  requiredSkill: SkillType;
  userCount: number;
  reward: number;
  penalty: number;
}

export interface SparePart {
  id: string;
  name: string;
  quantity: number;
}

export interface WeatherEvent {
  id: string;
  type: WeatherType;
  description: string;
  effectOnRound: number;
  cooldownModifier: number;
}

export interface DispatchAction {
  teamId: string;
  areaId: string;
  round: number;
  timestamp: number;
}

export interface LogEntry {
  round: number;
  timestamp: number;
  type: LogType;
  level: LogLevel;
  message: string;
  source: string;
  line?: number;
}

export interface FailReason {
  round: number;
  type: FailType;
  areaId?: string;
  teamId?: string;
  description: string;
  detail: string;
  source: string;
}

export interface GameState {
  currentRound: number;
  maxRounds: number;
  teams: RepairTeam[];
  areas: Area[];
  spareParts: SparePart[];
  weather: WeatherEvent;
  logs: LogEntry[];
  score: number;
  gameOver: boolean;
  failReasons: FailReason[];
  dispatchHistory: DispatchAction[];
  stateSnapshots: GameState[];
  sparePartPerRepair: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  maxRounds: number;
  initialTeams: Omit<RepairTeam, 'status' | 'cooldown' | 'currentTarget' | 'executeRounds'>[];
  initialAreas: Omit<Area, 'powerStatus' | 'timeoutRounds'>[];
  initialSpareParts: SparePart[];
  weatherSequence: WeatherEvent[];
  timeoutThreshold: number;
  baseExecuteRounds: number;
  baseCooldownRounds: number;
  sparePartPerRepair: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: {
    type: FailType;
    message: string;
    detail: string;
    source: string;
  };
}

export interface ReplayRecord {
  id: string;
  levelId: string;
  levelName: string;
  startTime: number;
  endTime: number;
  finalScore: number;
  maxScore: number;
  actions: DispatchAction[];
  stateSnapshots: GameState[];
  failReasons: FailReason[];
}

export interface DispatchRecord {
  id: string;
  round: number;
  teamName: string;
  areaName: string;
  success: boolean;
  errorType?: FailType;
  errorMessage?: string;
}

export const SKILL_LABELS: Record<SkillType, string> = {
  line_repair: '线路抢修',
  transformer: '变压器',
  cable: '电缆敷设',
  substation: '变电站'
};

export const AREA_TYPE_LABELS: Record<AreaType, string> = {
  hospital: '医院',
  residential: '居民区',
  commercial: '商业区',
  industrial: '工业区'
};

export const WEATHER_TYPE_LABELS: Record<WeatherType, string> = {
  typhoon: '台风',
  rainstorm: '暴雨',
  lightning: '雷电',
  normal: '晴朗',
  fog: '大雾'
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  idle: '待命',
  executing: '执行中',
  cooling: '冷却中'
};

export const POWER_STATUS_LABELS: Record<PowerStatus, string> = {
  normal: '正常供电',
  damaged: '受损',
  blackout: '停电'
};

export const FAIL_TYPE_LABELS: Record<FailType, string> = {
  timeout: '超时',
  duplicate_dispatch: '重复派遣',
  spare_parts_insufficient: '备件不足',
  skill_mismatch: '技能不匹配',
  team_cooling: '队伍冷却中',
  other: '其他错误'
};