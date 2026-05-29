export type Emotion = 'angry' | 'frustrated' | 'neutral' | 'satisfied' | null;

export type Intent =
  | 'refund'
  | 'complaint'
  | 'inquiry'
  | 'technical_support'
  | 'cancellation'
  | 'unknown';

export type Decision = 'ai' | 'human' | 'observe';

export type ErrorType =
  | 'emotion_misjudge'
  | 'repeated_reply'
  | 'delayed_escalation'
  | 'wrong_diversion'
  | 'intent_misjudge'
  | 'resource_ignore';

export type DirtyDataAction =
  | 'auto_complete'
  | 'warning'
  | 'skip'
  | 'user_hint';

export type BusyLevel = 'low' | 'medium' | 'high' | 'critical';

export type RuleCategory = 'emotion' | 'intent' | 'bot_limit' | 'resource' | 'special';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'idle' | 'playing' | 'finished';

export type Level = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ConversationCard {
  id: string;
  customerMessage: string | null;
  emotion: Emotion;
  emotionConfidence: number | null;
  botReply: string | null;
  botReplyHistory: string[];
  intent: Intent | null;
  intentConfidence: number | null;
  remarks: string | null;
  isDirty: boolean;
  dirtyFields: string[];
  dirtyDataAction: DirtyDataAction;
  requiredDecision: Decision;
  escalationReason: string[];
  difficulty: Difficulty;
  createdAt: number;
}

export interface DecisionRecord {
  cardId: string;
  userDecision: Decision;
  correctDecision: Decision;
  isCorrect: boolean;
  errorType: ErrorType | null;
  errorDetails: string | null;
  matchedRules: string[];
  responseTime: number;
  timestamp: number;
  dirtyDataHandled: boolean;
  cardSnapshot: ConversationCard;
}

export interface AgentResource {
  totalAgents: number;
  busyAgents: number;
  queueLength: number;
  avgWaitTime: number;
  busyLevel: BusyLevel;
}

export interface DiversionRule {
  id: string;
  name: string;
  description: string;
  condition: (card: ConversationCard, resources: AgentResource) => boolean;
  priority: number;
  category: RuleCategory;
}

export interface GameState {
  status: GameStatus;
  currentCardIndex: number;
  cards: ConversationCard[];
  decisionRecords: DecisionRecord[];
  score: number;
  totalScore: number;
  resources: AgentResource;
  startTime: number | null;
  difficulty: Difficulty;
  currentHint: string | null;
}

export interface ResultStats {
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  avgResponseTime: number;
  score: number;
  errorBreakdown: Record<ErrorType, number>;
  ruleMatchBreakdown: Record<string, number>;
  dirtyDataHandled: number;
  level: Level;
}

export interface DirtyDataResult {
  card: ConversationCard;
  action: DirtyDataAction;
  userHint?: string;
}

export const EMOTION_LABELS: Record<Exclude<Emotion, null>, string> = {
  angry: '愤怒',
  frustrated: '不满',
  neutral: '中性',
  satisfied: '满意',
};

export const INTENT_LABELS: Record<Intent, string> = {
  refund: '退款',
  complaint: '投诉',
  inquiry: '咨询',
  technical_support: '技术支持',
  cancellation: '注销',
  unknown: '未知',
};

export const DECISION_LABELS: Record<Decision, string> = {
  ai: 'AI机器人处理',
  human: '转人工坐席',
  observe: '继续观察',
};

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  emotion_misjudge: '情绪误判',
  repeated_reply: '重复答复',
  delayed_escalation: '升级太晚',
  wrong_diversion: '分流错误',
  intent_misjudge: '意图误判',
  resource_ignore: '资源忽略',
};

export const DIRTY_ACTION_LABELS: Record<DirtyDataAction, string> = {
  auto_complete: '已自动补全',
  warning: '警告',
  skip: '跳过',
  user_hint: '操作提示',
};

export const BUSY_LEVEL_LABELS: Record<BusyLevel, string> = {
  low: '空闲',
  medium: '正常',
  high: '繁忙',
  critical: '过载',
};
