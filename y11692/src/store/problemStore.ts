import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Problem,
  CorrectionRecord,
  CriticalPoint,
  SignInterval,
  StudentAnswer,
  Interval
} from '@/types';
import { PointType, ProblemStatus, ErrorType } from '@/types';

interface ProblemState {
  problems: Problem[];
  currentProblemId: string | null;
  isLoading: boolean;

  addProblem: (problem: Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProblem: (id: string, updates: Partial<Problem>) => void;
  deleteProblem: (id: string) => void;
  setCurrentProblem: (id: string | null) => void;
  addCorrection: (
    problemId: string,
    correction: Omit<CorrectionRecord, 'id' | 'timestamp'>
  ) => void;
  updateStatus: (id: string, status: ProblemStatus) => void;
  addStudentAnswer: (problemId: string, answer: Omit<StudentAnswer, 'id' | 'submittedAt'>) => void;
  addCriticalPoint: (problemId: string, point: Omit<CriticalPoint, 'isConfirmed'>) => void;
  updateCriticalPoint: (problemId: string, index: number, updates: Partial<CriticalPoint>) => void;
  removeCriticalPoint: (problemId: string, index: number) => void;
  setDomain: (problemId: string, domain: Interval[]) => void;
  resolveError: (problemId: string, errorId: string) => void;
  addScreenshot: (problemId: string, url: string) => void;
  removeScreenshot: (problemId: string, url: string) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const sampleProblems: Problem[] = [
  {
    id: generateId(),
    title: '三次函数极值分析',
    expression: 'x^3 - 3x + 2',
    derivative: '3 * x^2 - 3',
    secondDerivative: '6 * x',
    domain: [{ start: -5, end: 5, startInclusive: true, endInclusive: true }],
    nonDifferentiablePoints: [],
    criticalPoints: [
      { x: -1, y: 4, type: PointType.MAXIMUM, derivativeSign: 'zero', secondDerivativeSign: 'negative', isConfirmed: true },
      { x: 1, y: 0, type: PointType.MINIMUM, derivativeSign: 'zero', secondDerivativeSign: 'positive', isConfirmed: true }
    ],
    signIntervals: [
      { interval: { start: -5, end: -1, startInclusive: false, endInclusive: false }, sign: 'positive', derivativeLevel: 1 },
      { interval: { start: -1, end: 1, startInclusive: false, endInclusive: false }, sign: 'negative', derivativeLevel: 1 },
      { interval: { start: 1, end: 5, startInclusive: false, endInclusive: false }, sign: 'positive', derivativeLevel: 1 }
    ],
    inflectionPoints: [
      { x: 0, y: 2, type: PointType.INFLECTION, secondDerivativeSign: 'zero', isConfirmed: true }
    ],
    studentAnswers: [
      {
        id: generateId(),
        studentName: '张三',
        criticalPoints: [
          { x: -1, y: 4, type: PointType.MAXIMUM, isConfirmed: false },
          { x: 0, y: 2, type: PointType.CRITICAL, isConfirmed: false }
        ],
        signIntervals: [],
        submittedAt: new Date('2026-05-20')
      }
    ],
    errors: [
      {
        id: generateId(),
        type: ErrorType.CALCULATION_ERROR,
        description: '漏掉了极小值点 x=1',
        location: { x: 1 },
        severity: 'high',
        suggestion: '解方程 f\'(x) = 0 时注意检查是否有遗漏的解',
        isResolved: false
      },
      {
        id: generateId(),
        type: ErrorType.EXTREMA_INFLECTION_CONFUSED,
        description: '将拐点 x=0 错误标记为临界点',
        location: { x: 0 },
        severity: 'medium',
        suggestion: '拐点是二阶导数为零的点，不是一阶导数为零的点',
        isResolved: false
      }
    ],
    status: ProblemStatus.NEEDS_REVIEW,
    correctionHistory: [],
    screenshotUrls: [],
    source: '教材第五章习题',
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-05-20')
  },
  {
    id: generateId(),
    title: '含绝对值函数的极值',
    expression: 'abs(x^2 - 4)',
    derivative: undefined,
    secondDerivative: undefined,
    domain: [{ start: -5, end: 5, startInclusive: true, endInclusive: true }],
    nonDifferentiablePoints: [-2, 2],
    criticalPoints: [
      { x: -2, y: 0, type: PointType.NON_DIFFERENTIABLE, isConfirmed: true },
      { x: 0, y: 4, type: PointType.MAXIMUM, derivativeSign: 'zero', isConfirmed: true },
      { x: 2, y: 0, type: PointType.NON_DIFFERENTIABLE, isConfirmed: true }
    ],
    signIntervals: [],
    inflectionPoints: [],
    studentAnswers: [],
    errors: [],
    status: ProblemStatus.UNPROCESSED,
    correctionHistory: [],
    screenshotUrls: [],
    source: '月考试卷第15题',
    createdAt: new Date('2026-05-25'),
    updatedAt: new Date('2026-05-25')
  },
  {
    id: generateId(),
    title: '三角函数极值分析',
    expression: 'sin(x) + cos(x)',
    derivative: 'cos(x) - sin(x)',
    secondDerivative: '-sin(x) - cos(x)',
    domain: [{ start: 0, end: 6.283, startInclusive: true, endInclusive: true }],
    nonDifferentiablePoints: [],
    criticalPoints: [
      { x: 0.785, y: 1.414, type: PointType.MAXIMUM, isConfirmed: true },
      { x: 3.927, y: -1.414, type: PointType.MINIMUM, isConfirmed: true }
    ],
    signIntervals: [],
    inflectionPoints: [],
    studentAnswers: [],
    errors: [],
    status: ProblemStatus.CORRECTED,
    correctionHistory: [
      {
        id: generateId(),
        timestamp: new Date('2026-05-22'),
        field: 'criticalPoints',
        oldValue: '[]',
        newValue: '2 points',
        correctedBy: '李老师',
        reason: '补充了标准临界点'
      }
    ],
    screenshotUrls: [],
    source: '课堂练习',
    createdAt: new Date('2026-05-22'),
    updatedAt: new Date('2026-05-23')
  }
];

export const useProblemStore = create<ProblemState>()(
  persist(
    (set) => ({
      problems: sampleProblems,
      currentProblemId: null,
      isLoading: false,

      addProblem: (problem) =>
        set((state) => ({
          problems: [
            ...state.problems,
            {
              ...problem,
              id: generateId(),
              createdAt: new Date(),
              updatedAt: new Date()
            } as Problem
          ]
        })),

      updateProblem: (id, updates) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          )
        })),

      deleteProblem: (id) =>
        set((state) => ({
          problems: state.problems.filter((p) => p.id !== id),
          currentProblemId: state.currentProblemId === id ? null : state.currentProblemId
        })),

      setCurrentProblem: (id) =>
        set(() => ({
          currentProblemId: id
        })),

      addCorrection: (problemId, correction) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId
              ? {
                  ...p,
                  correctionHistory: [
                    ...p.correctionHistory,
                    {
                      ...correction,
                      id: generateId(),
                      timestamp: new Date()
                    } as CorrectionRecord
                  ],
                  updatedAt: new Date()
                }
              : p
          )
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === id ? { ...p, status, updatedAt: new Date() } : p
          )
        })),

      addStudentAnswer: (problemId, answer) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId
              ? {
                  ...p,
                  studentAnswers: [
                    ...p.studentAnswers,
                    {
                      ...answer,
                      id: generateId(),
                      submittedAt: new Date()
                    } as StudentAnswer
                  ],
                  updatedAt: new Date()
                }
              : p
          )
        })),

      addCriticalPoint: (problemId, point) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId
              ? {
                  ...p,
                  criticalPoints: [...p.criticalPoints, { ...point, isConfirmed: false }],
                  updatedAt: new Date()
                }
              : p
          )
        })),

      updateCriticalPoint: (problemId, index, updates) =>
        set((state) => ({
          problems: state.problems.map((p) => {
            if (p.id !== problemId) return p;
            const newPoints = [...p.criticalPoints];
            newPoints[index] = { ...newPoints[index], ...updates };
            return { ...p, criticalPoints: newPoints, updatedAt: new Date() };
          })
        })),

      removeCriticalPoint: (problemId, index) =>
        set((state) => ({
          problems: state.problems.map((p) => {
            if (p.id !== problemId) return p;
            const newPoints = p.criticalPoints.filter((_, i) => i !== index);
            return { ...p, criticalPoints: newPoints, updatedAt: new Date() };
          })
        })),

      setDomain: (problemId, domain) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId ? { ...p, domain, updatedAt: new Date() } : p
          )
        })),

      resolveError: (problemId, errorId) =>
        set((state) => ({
          problems: state.problems.map((p) => {
            if (p.id !== problemId) return p;
            return {
              ...p,
              errors: p.errors.map((e) =>
                e.id === errorId ? { ...e, isResolved: true } : e
              ),
              updatedAt: new Date()
            };
          })
        })),

      addScreenshot: (problemId, url) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId
              ? { ...p, screenshotUrls: [...p.screenshotUrls, url], updatedAt: new Date() }
              : p
          )
        })),

      removeScreenshot: (problemId, url) =>
        set((state) => ({
          problems: state.problems.map((p) =>
            p.id === problemId
              ? { ...p, screenshotUrls: p.screenshotUrls.filter((u) => u !== url), updatedAt: new Date() }
              : p
          )
        }))
    }),
    {
      name: 'calculus-problem-store'
    }
  )
);
