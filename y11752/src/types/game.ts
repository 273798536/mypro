export type MaterialType = 'claim' | 'invoice' | 'photo' | 'policy' | 'emotion' | 'report';
export type RiskType = 'duplicate' | 'exemption' | 'timeout' | 'missing' | null;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type EmotionType = 'happy' | 'neutral' | 'angry';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Material {
  id: string;
  type: MaterialType;
  title: string;
  content: string;
  source: string;
  hasRisk: boolean;
  riskType?: RiskType;
  riskDescription?: string;
  isComplete: boolean;
  relatedMaterialIds?: string[];
}

export interface AnswerKey {
  materialId: string;
  shouldMarkRisk: boolean;
  riskType?: RiskType;
  points: number;
  explanation: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  customer: {
    name: string;
    avatar: string;
    emotion: EmotionType;
  };
  timeLimit: number;
  difficulty: Difficulty;
  materials: Material[];
  correctAnswers: AnswerKey[];
}

export interface UserAnswer {
  materialId: string;
  markedRisk: boolean;
  riskType?: RiskType;
  isCorrect: boolean;
  timestamp: number;
}

export interface Mistake {
  materialId: string;
  materialTitle: string;
  userAnswer: boolean;
  correctAnswer: boolean;
  pointsLost: number;
  explanation: string;
  source: string;
}

export interface GameRecord {
  id: string;
  caseId: string;
  caseTitle: string;
  startTime: number;
  endTime: number;
  totalTime: number;
  score: number;
  maxScore: number;
  grade: Grade;
  answers: UserAnswer[];
  mistakes: Mistake[];
  exported: boolean;
  exportHash?: string;
}

export interface GameState {
  currentCase: Case | null;
  selectedMaterials: string[];
  markedRisks: Record<string, RiskType>;
  timeRemaining: number;
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  answers: UserAnswer[];
}
