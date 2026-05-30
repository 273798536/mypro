export type Difficulty = 1 | 2 | 3

export type ClueType = 'theory' | 'hint' | 'trap'

export type ErrorType =
  | 'inversion_misjudgment'
  | 'enharmonic_confusion'
  | 'duplicate_clue'
  | 'wrong_combination'
  | 'correct'
  | 'other'

export interface Case {
  id: string
  title: string
  description: string
  difficulty: Difficulty
  targetConcept: string
  tags: string[]
  brief: string
  correctAnswerId: string
  correctClueIds: string[]
  correctAudioClueIds: string[]
  expectedErrorType?: ErrorType
}

export interface Clue {
  id: string
  caseId: string
  content: string
  type: ClueType
  source: string
  isKey: boolean
  relatedConcepts: string[]
  fingerprint: string
}

export interface AudioClue {
  id: string
  caseId: string
  name: string
  audioData: number[]
  description: string
  chordInfo: string
  isKey: boolean
  duration: number
  fingerprint: string
  isDuplicate?: boolean
  duplicateOf?: string
}

export interface AnswerOption {
  id: string
  caseId: string
  label: string
  value: string
  isCorrect: boolean
  explanation: string
  inversionInfo?: string
  modeInfo?: string
}

export interface UserJudgment {
  id: string
  caseId: string
  selectedAnswerId: string
  selectedClueIds: string[]
  selectedAudioClueIds: string[]
  isCorrect: boolean
  score: number
  timestamp: number
}

export interface SourceTraceItem {
  type: 'clue' | 'audio_clue'
  id: string
  reference: string
}

export interface ErrorAnalysis {
  type: ErrorType
  typeLabel: string
  description: string
  suggestion: string
  sourceTrace: SourceTraceItem[]
}

export interface ClueCombinationAnalysis {
  userCombination: string[]
  correctCombination: string[]
  missingClues: string[]
  redundantClues: string[]
  duplicateClues: { id: string; duplicateOf: string }[]
  combinationScore: number
}

export interface CaseReport {
  caseId: string
  caseTitle: string
  userJudgment: UserJudgment
  correctAnswer: AnswerOption
  selectedAnswer: AnswerOption
  errorAnalysis?: ErrorAnalysis
  clueCombinationAnalysis: ClueCombinationAnalysis
  timestamp: number
}

export interface GameState {
  totalScore: number
  solvedCases: string[]
  currentJudgment: UserJudgment | null
  lastReport: CaseReport | null
}

export const ERROR_TYPE_LABELS: Record<ErrorType, string> = {
  inversion_misjudgment: '转位误判',
  enharmonic_confusion: '同名调混淆',
  duplicate_clue: '线索重复未识别',
  wrong_combination: '线索组合错误',
  correct: '推理正确',
  other: '其他错误',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '入门',
  2: '进阶',
  3: '挑战',
}
