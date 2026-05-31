
export type VoicePart = 'soprano' | 'alto' | 'tenor' | 'bass';

export type GestureType =
  | 'volume_up'
  | 'volume_down'
  | 'emphasize'
  | 'sync'
  | 'rest'
  | 'hold';

export type ErrorType = 'delayed_entry' | 'volume_imbalance' | 'rest_misjudgment';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export type SessionStatus = 'playing' | 'completed' | 'abandoned';

export interface VoiceState {
  part: VoicePart;
  name: string;
  volume: number;
  rhythmOffset: number;
  syncLevel: number;
}

export interface DecisionStep {
  id: string;
  round: number;
  gesture: GestureType;
  targetVoice: VoicePart | 'all';
  scoreImpact: number;
  description: string;
  timestamp: number;
  triggeredSync: boolean;
}

export interface ErrorEvent {
  id: string;
  type: ErrorType;
  voicePart: VoicePart;
  round: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  pointsLost: number;
}

export interface GameSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  currentRound: number;
  totalRounds: number;
  score: number;
  grade: Grade;
  voiceStates: VoiceState[];
  decisions: DecisionStep[];
  errors: ErrorEvent[];
  sceneName: string;
}

export interface GameState {
  session: GameSession | null;
  isPlaying: boolean;
  isPaused: boolean;
}

export type GameAction =
  | { type: 'START_GAME'; payload: { sceneName: string; totalRounds: number } }
  | { type: 'MAKE_DECISION'; payload: { gesture: GestureType; target: VoicePart | 'all' } }
  | { type: 'NEXT_ROUND' }
  | { type: 'END_GAME' }
  | { type: 'LOAD_SESSION'; payload: GameSession }
  | { type: 'RESET_GAME' };

export const VOICE_PARTS: { part: VoicePart; name: string; color: string }[] = [
  { part: 'soprano', name: '女高音', color: '#E91E63' },
  { part: 'alto', name: '女低音', color: '#9C27B0' },
  { part: 'tenor', name: '男高音', color: '#2196F3' },
  { part: 'bass', name: '男低音', color: '#4CAF50' },
];

export const GESTURES: { type: GestureType; name: string; icon: string; description: string }[] = [
  { type: 'volume_up', name: '提高音量', icon: 'volume-2', description: '增加指定声部的音量' },
  { type: 'volume_down', name: '降低音量', icon: 'volume-1', description: '降低指定声部的音量' },
  { type: 'emphasize', name: '声部强调', icon: 'star', description: '突出某个声部的表现' },
  { type: 'sync', name: '节奏同步', icon: 'refresh-cw', description: '调整声部节奏对齐' },
  { type: 'rest', name: '休止指示', icon: 'pause', description: '指示声部暂停' },
  { type: 'hold', name: '保持稳定', icon: 'check', description: '维持当前状态' },
];

export const ERROR_TYPES: { type: ErrorType; name: string; color: string }[] = [
  { type: 'delayed_entry', name: '延迟进入', color: '#F39C12' },
  { type: 'volume_imbalance', name: '音量失衡', color: '#E74C3C' },
  { type: 'rest_misjudgment', name: '休止误判', color: '#9B59B6' },
];

export const SCENES = [
  { name: '欢乐颂', difficulty: '简单', rounds: 8 },
  { name: '黄河大合唱', difficulty: '中等', rounds: 12 },
  { name: '贝多芬第九交响曲', difficulty: '困难', rounds: 16 },
];

