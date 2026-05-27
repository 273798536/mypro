import { create } from 'zustand';
import type {
  GameState,
  GameStatus,
  MathFunction,
  JudgementPoint,
  ErrorRecord,
  GameRecord,
  SlopeType,
  Point,
  CorrectionStatus
} from '../types';
import { generateCurvePoints, calculateSlopeTypeAtPoint, evaluateFunctionAtPoint } from '../math/DerivativeCalculator';
import { checkIsExtremum } from '../math/ExtremumDetector';
import { isNearSpecialPoint, validateJudgementAtSpecialPoint } from '../math/SpecialPointHandler';
import { generateFunctionById } from '../math/FunctionGenerator';
import { levelConfigs } from '../data/levels';

const INITIAL_LIVES = 3;
const POINTS_PER_CORRECT = 10;
const BONUS_PER_LEVEL = 50;

const initialState: GameState = {
  currentLevel: 1,
  score: 0,
  lives: INITIAL_LIVES,
  status: 'idle',
  currentFunction: null,
  characterPosition: { x: 0, y: 0 },
  judgementPoints: [],
  currentJudgementIndex: 0,
  gameHistory: [],
  currentErrors: [],
  curvePoints: [],
  isWaitingForJudgement: false,
  feedbackMessage: null,
  feedbackType: null,
  currentGameStartTime: null
};

export const useGameStore = create<GameState & {
  startGame: (levelId?: number) => void;
  startLevel: (levelId: number) => void;
  submitJudgement: (answer: SlopeType | boolean) => void;
  moveToNextPoint: () => void;
  loseLife: (reason: string) => void;
  completeLevel: () => void;
  endGame: () => void;
  resetGame: () => void;
  setFeedback: (message: string, type: 'success' | 'error' | 'info') => void;
  clearFeedback: () => void;
  loadGameHistory: () => void;
  updateErrorStatus: (errorId: string, newStatus: CorrectionStatus, note?: string) => void;
}>((set, get) => ({
  ...initialState,

  startGame: (levelId: number = 1) => {
    const history = loadHistoryFromStorage();
    set({
      ...initialState,
      gameHistory: history,
      currentGameStartTime: Date.now()
    });
    get().startLevel(levelId);
  },

  startLevel: (levelId: number) => {
    const levelConfig = levelConfigs.find(l => l.id === levelId);
    if (!levelConfig) return;

    const functionId = levelConfig.functionIds[Math.floor(Math.random() * levelConfig.functionIds.length)];
    const mathFunc = generateFunctionById(functionId);
    if (!mathFunc) return;

    const curvePoints = generateCurvePoints(mathFunc.expression, mathFunc.domain, 200);

    if (curvePoints.length === 0) {
      console.error('无法生成曲线点');
      return;
    }

    const judgementPoints = generateJudgementPoints(mathFunc, levelConfig.judgementCount);
    const startPoint = curvePoints[0];

    set(state => ({
      currentLevel: levelId,
      status: 'playing',
      currentFunction: mathFunc,
      curvePoints,
      characterPosition: { x: startPoint.x, y: startPoint.y },
      judgementPoints,
      currentJudgementIndex: 0,
      isWaitingForJudgement: judgementPoints.length > 0,
      currentErrors: state.currentErrors
    }));

    if (judgementPoints.length > 0) {
      const firstPoint = judgementPoints[0];
      const specialPoint = isNearSpecialPoint(firstPoint.x, mathFunc.specialPoints);
      if (specialPoint) {
        const warning = getSpecialPointWarningMessage(specialPoint.type);
        set({ feedbackMessage: warning, feedbackType: 'info' });
      }
    }
  },

  submitJudgement: (answer: SlopeType | boolean) => {
    const state = get();
    if (state.status !== 'playing' || !state.isWaitingForJudgement || !state.currentFunction) return;

    const currentJudgement = state.judgementPoints[state.currentJudgementIndex];
    if (!currentJudgement) return;

    const specialPoint = isNearSpecialPoint(currentJudgement.x, state.currentFunction.specialPoints);

    let isCorrect = false;
    let errorReason = '';

    if (specialPoint) {
      const validation = validateJudgementAtSpecialPoint(
        specialPoint,
        currentJudgement.type,
        String(answer)
      );
      isCorrect = validation.isValid;
      errorReason = validation.reason;
    } else {
      if (currentJudgement.type === 'slope') {
        const slopeType = calculateSlopeTypeAtPoint(state.currentFunction.expression, currentJudgement.x);
        isCorrect = answer === slopeType;
        if (!isCorrect) {
          errorReason = `斜率判断错误：正确答案为"${getSlopeLabel(slopeType)}"，你选择了"${getSlopeLabel(answer as SlopeType)}"`;
        }
      } else if (currentJudgement.type === 'extremum') {
        const { isExtremum } = checkIsExtremum(state.currentFunction.expression, currentJudgement.x);
        isCorrect = answer === isExtremum;
        if (!isCorrect) {
          errorReason = `极值判断错误：${isExtremum ? '此点是极值点' : '此点不是极值点'}`;
        }
      }
    }

    const updatedJudgements = [...state.judgementPoints];
    updatedJudgements[state.currentJudgementIndex] = {
      ...currentJudgement,
      playerAnswer: answer,
      isCorrect,
      timestamp: Date.now(),
      errorReason: !isCorrect ? errorReason : undefined
    };

    if (isCorrect) {
      const newScore = state.score + POINTS_PER_CORRECT;
      set({
        score: newScore,
        judgementPoints: updatedJudgements,
        feedbackMessage: `✓ 正确！+${POINTS_PER_CORRECT}分`,
        feedbackType: 'success'
      });
    } else {
      const errorRecord: ErrorRecord = {
        id: generateId(),
        levelId: state.currentLevel,
        functionId: state.currentFunction.id,
        point: { x: currentJudgement.x, y: currentJudgement.y },
        judgementType: currentJudgement.type,
        playerAnswer: String(answer),
        correctAnswer: String(currentJudgement.correctAnswer),
        reason: errorReason,
        correctionStatus: 'unprocessed',
        timestamp: Date.now(),
        source: `关卡${state.currentLevel} - ${state.currentFunction.displayExpression}`,
        revisionHistory: []
      };

      const newLives = state.lives - 1;

      set({
        lives: newLives,
        judgementPoints: updatedJudgements,
        currentErrors: [...state.currentErrors, errorRecord],
        feedbackMessage: `✗ ${errorReason}`,
        feedbackType: 'error'
      });

      if (newLives <= 0) {
        setTimeout(() => {
          get().endGame();
        }, 1500);
        return;
      }
    }

    setTimeout(() => {
      get().clearFeedback();
      get().moveToNextPoint();
    }, 1000);
  },

  moveToNextPoint: () => {
    const state = get();
    const nextIndex = state.currentJudgementIndex + 1;

    if (nextIndex >= state.judgementPoints.length) {
      get().completeLevel();
      return;
    }

    const nextJudgement = state.judgementPoints[nextIndex];
    const targetPointIndex = state.curvePoints.findIndex(
      p => Math.abs(p.x - nextJudgement.x) < 0.1
    );

    const targetIndex = targetPointIndex >= 0 ? targetPointIndex : Math.floor(state.curvePoints.length * (nextIndex / state.judgementPoints.length));
    const targetPoint = state.curvePoints[Math.min(targetIndex, state.curvePoints.length - 1)];

    set({
      currentJudgementIndex: nextIndex,
      characterPosition: { x: targetPoint.x, y: targetPoint.y },
      isWaitingForJudgement: true
    });

    if (state.currentFunction) {
      const specialPoint = isNearSpecialPoint(nextJudgement.x, state.currentFunction.specialPoints);
      if (specialPoint) {
        const warning = getSpecialPointWarningMessage(specialPoint.type);
        set({ feedbackMessage: warning, feedbackType: 'info' });
      }
    }
  },

  loseLife: (reason: string) => {
    const state = get();
    const newLives = state.lives - 1;

    set({
      lives: newLives,
      feedbackMessage: reason,
      feedbackType: 'error'
    });

    if (newLives <= 0) {
      setTimeout(() => {
        get().endGame();
      }, 1500);
    }
  },

  completeLevel: () => {
    const state = get();
    const newScore = state.score + BONUS_PER_LEVEL;

    set({
      score: newScore,
      status: 'levelComplete',
      feedbackMessage: `🎉 关卡${state.currentLevel}完成！+${BONUS_PER_LEVEL}分奖励`,
      feedbackType: 'success'
    });

    const maxLevel = levelConfigs.length;
    if (state.currentLevel >= maxLevel) {
      setTimeout(() => {
        get().endGame();
      }, 2000);
    }
  },

  endGame: () => {
    const state = get();
    const endTime = Date.now();
    const startTime = state.currentGameStartTime || endTime;

    const totalJudgements = state.judgementPoints.length;
    const correctJudgements = state.judgementPoints.filter(j => j.isCorrect).length;

    const gameRecord: GameRecord = {
      id: generateId(),
      startTime,
      endTime,
      totalScore: state.score,
      levelsCompleted: state.status === 'allComplete' ? levelConfigs.length : state.currentLevel - 1,
      totalJudgements,
      correctJudgements,
      errors: state.currentErrors,
      functionHistory: state.currentFunction ? [state.currentFunction.id] : []
    };

    const newHistory = [...state.gameHistory, gameRecord];
    saveHistoryToStorage(newHistory);

    set({
      status: state.lives <= 0 ? 'gameOver' : 'allComplete',
      gameHistory: newHistory
    });
  },

  resetGame: () => {
    const history = loadHistoryFromStorage();
    set({
      ...initialState,
      gameHistory: history
    });
  },

  setFeedback: (message: string, type: 'success' | 'error' | 'info') => {
    set({ feedbackMessage: message, feedbackType: type });
  },

  clearFeedback: () => {
    set({ feedbackMessage: null, feedbackType: null });
  },

  loadGameHistory: () => {
    const history = loadHistoryFromStorage();
    set({ gameHistory: history });
  },

  updateErrorStatus: (errorId: string, newStatus: CorrectionStatus, note?: string) => {
    const state = get();
    const updatedErrors = state.currentErrors.map(err => {
      if (err.id === errorId) {
        return {
          ...err,
          correctionStatus: newStatus,
          correctionNote: note,
          revisionHistory: [
            ...err.revisionHistory,
            {
              timestamp: Date.now(),
              oldStatus: err.correctionStatus,
              newStatus,
              note
            }
          ]
        };
      }
      return err;
    });
    set({ currentErrors: updatedErrors });
  }
}));

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateJudgementPoints(func: MathFunction, count: number): JudgementPoint[] {
  const points: JudgementPoint[] = [];
  const [start, end] = func.domain;
  const step = (end - start) / (count + 1);

  for (let i = 1; i <= count; i++) {
    const x = start + i * step;
    const y = evaluateFunctionAtPoint(func.expression, x);

    if (y === null) continue;

    const specialPoint = isNearSpecialPoint(x, func.specialPoints);
    const isSpecial = specialPoint !== null;

    let type: 'slope' | 'extremum';
    let correctAnswer: SlopeType | boolean;

    if (isSpecial && specialPoint) {
      if (specialPoint.type === 'extremum_max' || specialPoint.type === 'extremum_min') {
        type = Math.random() > 0.5 ? 'slope' : 'extremum';
        correctAnswer = type === 'slope' ? 'zero' : true;
      } else if (specialPoint.type === 'non_differentiable') {
        type = 'slope';
        correctAnswer = 'undefined';
      } else {
        continue;
      }
    } else {
      type = Math.random() > 0.3 ? 'slope' : 'extremum';
      if (type === 'slope') {
        correctAnswer = calculateSlopeTypeAtPoint(func.expression, x);
      } else {
        const { isExtremum } = checkIsExtremum(func.expression, x);
        correctAnswer = isExtremum;
      }
    }

    points.push({
      id: generateId(),
      x,
      y,
      type,
      correctAnswer,
      isSpecial,
      specialType: specialPoint?.type
    });
  }

  return points;
}

function getSlopeLabel(slope: SlopeType): string {
  const labels: Record<SlopeType, string> = {
    positive: '正斜率',
    negative: '负斜率',
    zero: '零斜率',
    undefined: '斜率不存在'
  };
  return labels[slope] || String(slope);
}

function getSpecialPointWarningMessage(type: string): string {
  const warnings: Record<string, string> = {
    extremum_max: '⭐ 提示：此点是极大值点！',
    extremum_min: '⭐ 提示：此点是极小值点！',
    non_differentiable: '⚠️ 警告：此点不可导，斜率不存在！',
    discontinuity: '⚠️ 警告：此点是间断点！'
  };
  return warnings[type] || '特殊点提示';
}

const STORAGE_KEY = 'math_climbing_history';

function saveHistoryToStorage(history: GameRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('保存历史记录失败:', e);
  }
}

function loadHistoryFromStorage(): GameRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载历史记录失败:', e);
  }
  return [];
}
