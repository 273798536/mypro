export type KnowledgeCategory = 'rhythm' | 'harmony' | 'melody' | 'interval' | 'chord';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'active' | 'pending_review' | 'duplicate' | 'deprecated';

export type TagStatus = 'confirmed' | 'pending' | 'missing';

export interface KnowledgeTag {
  id: string;
  category: KnowledgeCategory;
  name: string;
  description: string;
}

export interface ChangeRecord {
  id: string;
  questionId: string;
  field: 'difficulty' | 'tags' | 'answer' | 'status';
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: number;
  remark: string;
}

export interface AnswerRecord {
  id: string;
  questionId: string;
  studentId: string;
  studentName: string;
  isCorrect: boolean;
  answerTime: number;
  score?: number;
}

export interface DuplicateGroup {
  id: string;
  questionIds: string[];
  similarity: number;
  detectedAt: number;
  status: 'detected' | 'confirmed' | 'resolved';
}

export interface DifficultyDrift {
  id: string;
  questionId: string;
  expectedDifficulty: DifficultyLevel;
  actualDifficulty: number;
  driftScore: number;
  detectedAt: number;
  assignee?: string;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface ExamStrategy {
  id: string;
  name: string;
  totalQuestions: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  categoryDistribution: Record<KnowledgeCategory, number>;
  excludeQuestionIds: string[];
}

export interface ExamPaper {
  id: string;
  name: string;
  createdAt: number;
  strategy: ExamStrategy;
  questions: Question[];
  balanceScore: number;
  exportedAt?: number;
}

export interface Question {
  id: string;
  title: string;
  audioUrl: string;
  audioDuration: number;
  correctAnswer: string;
  options: string[];
  difficulty: DifficultyLevel;
  tags: string[];
  tagStatus: TagStatus;
  status: QuestionStatus;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  answerRecords: AnswerRecord[];
  changeHistory: ChangeRecord[];
  duplicateGroupId?: string;
  driftId?: string;
  correctRate?: number;
  totalAttempts?: number;
}

export interface AppState {
  questions: Question[];
  knowledgeTags: KnowledgeTag[];
  duplicateGroups: DuplicateGroup[];
  difficultyDrifts: DifficultyDrift[];
  examPapers: ExamPaper[];
  currentUser: {
    id: string;
    name: string;
    role: 'teacher' | 'researcher';
  };
  filters: {
    search: string;
    categories: KnowledgeCategory[];
    difficulties: DifficultyLevel[];
    tagStatus: TagStatus[];
    status: QuestionStatus[];
  };
}

export type PageType = 'dashboard' | 'questions' | 'question-detail' | 'generator' | 'quality' | 'answers';
