export enum ProblemStatus {
  UNPROCESSED = 'unprocessed',
  CORRECTED = 'corrected',
  NEEDS_REVIEW = 'needs_review'
}

export enum PointType {
  CRITICAL = 'critical',
  MAXIMUM = 'maximum',
  MINIMUM = 'minimum',
  INFLECTION = 'inflection',
  NON_DIFFERENTIABLE = 'non_differentiable'
}

export enum ErrorType {
  DOMAIN_MISSING = 'domain_missing',
  NON_DIFFERENTIABLE_IGNORED = 'non_diff_ignored',
  EXTREMA_INFLECTION_CONFUSED = 'extrema_inflection_confused',
  WRONG_SIGN_INTERVAL = 'wrong_sign_interval',
  CALCULATION_ERROR = 'calculation_error'
}

export type Sign = 'positive' | 'negative' | 'zero';

export interface Interval {
  start: number;
  end: number;
  startInclusive: boolean;
  endInclusive: boolean;
}

export interface CriticalPoint {
  x: number;
  y: number;
  type: PointType;
  derivativeSign?: Sign;
  secondDerivativeSign?: Sign;
  isConfirmed: boolean;
}

export interface SignInterval {
  interval: Interval;
  sign: Sign;
  derivativeLevel: 1 | 2;
}

export interface StudentAnswer {
  id: string;
  studentName: string;
  criticalPoints: CriticalPoint[];
  signIntervals: SignInterval[];
  submittedAt: Date;
}

export interface CorrectionRecord {
  id: string;
  timestamp: Date;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  correctedBy: string;
  reason: string;
}

export interface ErrorAnalysis {
  id: string;
  type: ErrorType;
  description: string;
  location?: { x?: number; interval?: Interval };
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
  isResolved: boolean;
}

export interface Problem {
  id: string;
  title: string;
  expression: string;
  derivative?: string;
  secondDerivative?: string;
  domain: Interval[];
  nonDifferentiablePoints: number[];
  criticalPoints: CriticalPoint[];
  signIntervals: SignInterval[];
  inflectionPoints: CriticalPoint[];
  studentAnswers: StudentAnswer[];
  errors: ErrorAnalysis[];
  status: ProblemStatus;
  correctionHistory: CorrectionRecord[];
  screenshotUrls: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportStats {
  total: number;
  unprocessed: number;
  corrected: number;
  needsReview: number;
  byErrorType: Record<ErrorType, number>;
}

export interface MathFunction {
  evaluate: (x: number) => number;
  derivative?: (x: number) => number;
  secondDerivative?: (x: number) => number;
}
