export interface Point {
  x: number;
  y: number;
}

export interface SurveyPoint {
  id: string;
  x: number;
  y: number;
  name: string;
  isTarget: boolean;
  measured?: boolean;
  order: number;
}

export interface Obstacle {
  id: string;
  polygonPoints: Point[];
  type: 'building' | 'water' | 'restricted';
  name: string;
}

export type OperationType = 'point_select' | 'angle_measure' | 'distance_input' | 'path_draw';

export type UnitType = 'm' | 'km' | 'cm';

export interface OperationData {
  angle?: number;
  distance?: number;
  unit?: UnitType;
  pathPoints?: Point[];
  fromPoint?: string;
  toPoint?: string;
  referencePoint?: string;
}

export interface OperationRecord {
  id: string;
  timestamp: number;
  type: OperationType;
  surveyPointId?: string;
  data: OperationData;
  isValid?: boolean;
}

export type ErrorType = 'angle_out_of_range' | 'unit_error' | 'obstacle_cross' | 'invalid_angle' | 'invalid_distance';

export type ErrorCategory = 'triangle_calculation' | 'path_selection';

export interface ErrorItem {
  id: string;
  type: ErrorType;
  category: ErrorCategory;
  ruleDescription: string;
  ruleReference: string;
  pointsDeducted: number;
  operationId: string;
  corrected?: boolean;
  correctionId?: string;
}

export type ScoreCategory = 'survey' | 'angle' | 'path' | 'unit';

export interface ScoreItem {
  id: string;
  category: ScoreCategory;
  categoryName: string;
  score: number;
  maxScore: number;
  ruleReference: string;
  errors: ErrorItem[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreReport {
  id: string;
  sessionId: string;
  totalScore: number;
  maxScore: number;
  grade: Grade;
  scoreItems: ScoreItem[];
  generatedAt: number;
}

export type CorrectionField = 'angle' | 'unit' | 'distance';

export interface CorrectionRecord {
  id: string;
  timestamp: number;
  teacherName: string;
  operationId: string;
  field: CorrectionField;
  oldValue: number | string;
  newValue: number | string;
  remark: string;
  recalculatedScores?: ScoreReport;
}

export type SessionStatus = 'playing' | 'submitted' | 'reviewed';

export interface GameSession {
  id: string;
  playerName: string;
  startTime: number;
  endTime?: number;
  taskId: string;
  status: SessionStatus;
  surveyPoints: SurveyPoint[];
  obstacles: Obstacle[];
  operations: OperationRecord[];
  scoreReport?: ScoreReport;
  corrections: CorrectionRecord[];
  currentStep: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  angleMin: number;
  angleMax: number;
  requiredUnit: UnitType;
  targetPoints: number;
  scale: number;
  surveyPoints: Omit<SurveyPoint, 'id' | 'measured'>[];
  obstacles: Omit<Obstacle, 'id'>[];
}

export type ToolType = 'select' | 'angle' | 'distance' | 'path' | 'reset';

export interface TrigonometryValues {
  sin: number;
  cos: number;
  tan: number;
}

export interface ReviewDetailRow {
  surveyPointId: string;
  surveyPointName: string;
  angleValue: number;
  angleUnit: string;
  distanceValue: number;
  distanceUnit: UnitType;
  sin: number;
  cos: number;
  tan: number;
  score: number;
  maxScore: number;
  errors: string[];
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeReviewDetails: boolean;
  includeCorrections: boolean;
  timestamp: number;
}
