import {
  GameSession,
  Task,
  ScoreReport,
  ScoreItem,
  ErrorItem,
  OperationRecord,
  ErrorCategory,
  ErrorType,
  ScoreCategory,
  Grade,
} from '@/types';
import { validateAngleRange, doesPathIntersectObstacle } from './geometry';

interface ScoringRule {
  id: string;
  name: string;
  description: string;
  category: ErrorCategory;
  errorType: ErrorType;
  scoreCategory: ScoreCategory;
  deduction: number;
  check: (op: OperationRecord, context: { task: Task; session: GameSession }) => boolean;
}

export const SCORING_RULES: ScoringRule[] = [
  {
    id: 'TRI-001',
    name: '角度范围越界',
    description: '测量角度必须在任务要求的范围内（{min}° ~ {max}°）',
    category: 'triangle_calculation',
    errorType: 'angle_out_of_range',
    scoreCategory: 'angle',
    deduction: 10,
    check: (op, { task }) => {
      if (op.type !== 'angle_measure' || op.data.angle === undefined) return false;
      return !validateAngleRange(op.data.angle, task.angleMin, task.angleMax);
    },
  },
  {
    id: 'TRI-002',
    name: '距离单位错误',
    description: '距离单位必须与任务要求一致（要求：{requiredUnit}）',
    category: 'triangle_calculation',
    errorType: 'unit_error',
    scoreCategory: 'unit',
    deduction: 5,
    check: (op, { task }) => {
      if (op.type !== 'distance_input' || op.data.unit === undefined) return false;
      return op.data.unit !== task.requiredUnit;
    },
  },
  {
    id: 'TRI-003',
    name: '无效角度值',
    description: '角度值必须在 0° ~ 180° 范围内',
    category: 'triangle_calculation',
    errorType: 'invalid_angle',
    scoreCategory: 'angle',
    deduction: 8,
    check: (op) => {
      if (op.type !== 'angle_measure' || op.data.angle === undefined) return false;
      return op.data.angle < 0 || op.data.angle > 180;
    },
  },
  {
    id: 'TRI-004',
    name: '无效距离值',
    description: '距离值必须大于 0',
    category: 'triangle_calculation',
    errorType: 'invalid_distance',
    scoreCategory: 'unit',
    deduction: 5,
    check: (op) => {
      if (op.type !== 'distance_input' || op.data.distance === undefined) return false;
      return op.data.distance <= 0;
    },
  },
  {
    id: 'PATH-001',
    name: '路径穿越障碍物',
    description: '测量路径不能穿越障碍物区域（{obstacleName}）',
    category: 'path_selection',
    errorType: 'obstacle_cross',
    scoreCategory: 'path',
    deduction: 15,
    check: (op, { session }) => {
      if (op.type !== 'path_draw' || !op.data.pathPoints) return false;
      for (const obstacle of session.obstacles) {
        if (doesPathIntersectObstacle(op.data.pathPoints, obstacle.polygonPoints)) {
          return true;
        }
      }
      return false;
    },
  },
];

const SCORE_CATEGORIES: { category: ScoreCategory; name: string; maxScore: number; ruleReference: string }[] = [
  { category: 'survey', name: '测绘点选择', maxScore: 25, ruleReference: 'SUR-001' },
  { category: 'angle', name: '角度计算', maxScore: 30, ruleReference: 'TRI-001, TRI-003' },
  { category: 'path', name: '路径规划', maxScore: 25, ruleReference: 'PATH-001' },
  { category: 'unit', name: '单位规范', maxScore: 20, ruleReference: 'TRI-002, TRI-004' },
];

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateGrade = (percentage: number): Grade => {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
};

const formatRuleDescription = (
  rule: ScoringRule,
  op: OperationRecord,
  context: { task: Task; session: GameSession }
): string => {
  let desc = rule.description;
  desc = desc.replace('{min}', context.task.angleMin.toString());
  desc = desc.replace('{max}', context.task.angleMax.toString());
  desc = desc.replace('{requiredUnit}', context.task.requiredUnit);

  if (rule.errorType === 'obstacle_cross' && op.data.pathPoints) {
    for (const obstacle of context.session.obstacles) {
      if (doesPathIntersectObstacle(op.data.pathPoints, obstacle.polygonPoints)) {
        desc = desc.replace('{obstacleName}', obstacle.name);
        break;
      }
    }
  }

  return desc;
};

export const checkOperationErrors = (
  op: OperationRecord,
  context: { task: Task; session: GameSession }
): ErrorItem[] => {
  const errors: ErrorItem[] = [];

  for (const rule of SCORING_RULES) {
    if (rule.check(op, context)) {
      errors.push({
        id: generateId(),
        type: rule.errorType,
        category: rule.category,
        ruleDescription: formatRuleDescription(rule, op, context),
        ruleReference: rule.id,
        pointsDeducted: rule.deduction,
        operationId: op.id,
      });
    }
  }

  return errors;
};

export const generateScoreReport = (session: GameSession, task: Task): ScoreReport => {
  const context = { task, session };
  const allErrors: ErrorItem[] = [];

  for (const op of session.operations) {
    const errors = checkOperationErrors(op, context);
    allErrors.push(...errors);
  }

  const scoreItems: ScoreItem[] = SCORE_CATEGORIES.map((cat) => {
    const categoryErrors = allErrors.filter((e) => {
      const rule = SCORING_RULES.find((r) => r.id === e.ruleReference);
      return rule?.scoreCategory === cat.category;
    });

    const totalDeduction = categoryErrors.reduce((sum, e) => sum + e.pointsDeducted, 0);
    const score = Math.max(0, cat.maxScore - totalDeduction);

    return {
      id: generateId(),
      category: cat.category,
      categoryName: cat.name,
      score,
      maxScore: cat.maxScore,
      ruleReference: cat.ruleReference,
      errors: categoryErrors,
    };
  });

  const totalScore = scoreItems.reduce((sum, item) => sum + item.score, 0);
  const maxScore = scoreItems.reduce((sum, item) => sum + item.maxScore, 0);
  const percentage = (totalScore / maxScore) * 100;

  return {
    id: generateId(),
    sessionId: session.id,
    totalScore,
    maxScore,
    grade: calculateGrade(percentage),
    scoreItems,
    generatedAt: Date.now(),
  };
};

export const recalculateScoreReport = (
  session: GameSession,
  task: Task,
  correctedOperations: OperationRecord[]
): ScoreReport => {
  const correctedSession = {
    ...session,
    operations: correctedOperations,
  };

  const report = generateScoreReport(correctedSession, task);

  for (const item of report.scoreItems) {
    for (const error of item.errors) {
      const correction = session.corrections.find((c) => c.operationId === error.operationId);
      if (correction) {
        error.corrected = true;
        error.correctionId = correction.id;
      }
    }
  }

  return report;
};

export const getErrorTypeLabel = (type: ErrorType): string => {
  const labels: Record<ErrorType, string> = {
    angle_out_of_range: '角度越界',
    unit_error: '距离单位错',
    obstacle_cross: '障碍穿越',
    invalid_angle: '无效角度',
    invalid_distance: '无效距离',
  };
  return labels[type];
};

export const getErrorCategoryLabel = (category: ErrorCategory): string => {
  const labels: Record<ErrorCategory, string> = {
    triangle_calculation: '三角计算',
    path_selection: '路径选择',
  };
  return labels[category];
};
