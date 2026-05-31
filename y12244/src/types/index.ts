export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ClueType = 'song_segment' | 'platform_notice' | 'sample_record' | 'contract' | 'auth_certificate';
export type RiskType = 'auth_expired' | 'sample_exceed' | 'name_confusion' | 'missing_evidence';
export type VerdictDecision = 'approve' | 'reject' | 'need_more';

export interface ScoreBreakdown {
  correctAssociation: number;
  wrongAssociation: number;
  correctVerdict: number;
  wrongVerdict: number;
  timePenalty: number;
  timeBonus: number;
  riskDiscovered: number;
  incompletePenalty: number;
}

export interface Clue {
  id: string;
  title: string;
  content: string;
  type: ClueType;
  correctCaseId: string;
  currentCaseId: string | null;
  triggerRisk?: string;
  isKeyEvidence: boolean;
  metadata?: Record<string, unknown>;
}

export interface Risk {
  id: string;
  type: RiskType;
  title: string;
  description: string;
  triggerClueId: string;
  caseId: string;
  nextStep: string;
  isDiscovered: boolean;
  discoveredAt: number | null;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  correctVerdict: VerdictDecision;
  verdictExplanation: string;
  humanVerdictExplanation: string;
  requiredClueTypes: ClueType[];
  requiredClueCount: number;
  clues: Clue[];
  risks: Risk[];
  userVerdict: VerdictDecision | null;
  isCompleted: boolean;
  completedAt: number | null;
}

export interface GameConfig {
  timeLimit: number;
  clueCount: number;
  caseCount: number;
}

export interface GameState {
  status: GameStatus;
  difficulty: Difficulty;
  timeLimit: number;
  timeRemaining: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  cases: Case[];
  clues: Clue[];
  unassignedClues: Clue[];
  discoveredRisks: Risk[];
  toasts: Toast[];
  startTime: number | null;
  endTime: number | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
}

export interface GameStore extends GameState {
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  tick: () => void;
  assignClue: (clueId: string, caseId: string) => void;
  unassignClue: (clueId: string) => void;
  submitVerdict: (caseId: string, verdict: VerdictDecision) => void;
  finishGame: () => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export interface AssociationResult {
  isCorrect: boolean;
  clue: Clue;
  caseId: string;
  triggeredRisk?: Risk;
}

export interface VerdictResult {
  isCorrect: boolean;
  case: Case;
  userVerdict: VerdictDecision;
  correctVerdict: VerdictDecision;
  explanation: string;
}

export const CLUE_TYPE_LABELS: Record<ClueType, string> = {
  song_segment: '歌曲片段',
  platform_notice: '平台通知',
  sample_record: '采样记录',
  contract: '合同条款',
  auth_certificate: '授权证书',
};

export const CLUE_TYPE_ICONS: Record<ClueType, string> = {
  song_segment: 'music',
  platform_notice: 'bell',
  sample_record: 'file-audio',
  contract: 'file-text',
  auth_certificate: 'award',
};

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  auth_expired: '授权过期',
  sample_exceed: '采样超限',
  name_confusion: '同名曲混淆',
  missing_evidence: '证据不足',
};

export const RISK_TYPE_COLORS: Record<RiskType, string> = {
  auth_expired: '#E74C3C',
  sample_exceed: '#F39C12',
  name_confusion: '#9B59B6',
  missing_evidence: '#3498DB',
};

export const VERDICT_LABELS: Record<VerdictDecision, string> = {
  approve: '授权通过',
  reject: '驳回申请',
  need_more: '需补充材料',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '初级',
  medium: '中级',
  hard: '高级',
};

export const DIFFICULTY_CONFIG: Record<Difficulty, GameConfig> = {
  easy: { timeLimit: 600, clueCount: 12, caseCount: 3 },
  medium: { timeLimit: 480, clueCount: 15, caseCount: 3 },
  hard: { timeLimit: 360, clueCount: 18, caseCount: 3 },
};

export const GRADE_THRESHOLDS = [
  { grade: 'S', min: 400, color: '#D4AF37' },
  { grade: 'A', min: 300, color: '#10B981' },
  { grade: 'B', min: 200, color: '#3B82F6' },
  { grade: 'C', min: 100, color: '#F59E0B' },
  { grade: 'D', min: -Infinity, color: '#EF4444' },
];
