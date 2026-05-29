import { create } from 'zustand';
import type {
  GameState,
  PlacedBond,
  Operation,
  ErrorRecord,
} from '@/types';
import { getLevelById } from '@/data/levels';
import { bondLibrary } from '@/data/bonds';
import { checkDurationMismatch, createErrorRecord } from '@/utils/errorDetection';
import { calculateDragScore, calculateCurveScore, calculateCashFlowScore } from '@/utils/scoreCalc';

interface GameStore extends GameState {
  startLevel: (levelId: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  placeBond: (bondId: string, slotId: string) => void;
  removeBond: (bondId: string) => void;
  adjustCurve: (direction: 'up' | 'down' | 'flat') => void;
  setCashFlowEstimate: (bondId: string, weights: number[]) => void;
  setFeedback: (message: string, type: 'success' | 'error' | 'info') => void;
  clearFeedback: () => void;
  tickTime: () => void;
  finishGame: () => void;
  resetGame: () => void;
  loadSavedState: () => boolean;
}

const STORAGE_KEY = 'bond-duration-puzzle-state';

function createInitialState(): GameState {
  return {
    phase: 'start',
    currentLevelId: null,
    score: 0,
    timeRemaining: 0,
    startTime: 0,
    placedBonds: [],
    currentCurveDirection: 'flat',
    cashFlowEstimates: {},
    operations: [],
    errors: [],
    feedback: null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  startLevel: (levelId: string) => {
    const level = getLevelById(levelId);
    if (!level) return;

    const usedBondIds = new Set<string>();
    bondLibrary.slice(0, 6).forEach(b => {
      usedBondIds.add(b.id);
    });

    const newState: Partial<GameState> = {
      phase: 'playing',
      currentLevelId: levelId,
      score: 0,
      timeRemaining: level.timeLimit,
      startTime: Date.now(),
      placedBonds: [],
      currentCurveDirection: level.yieldCurve.direction,
      cashFlowEstimates: {},
      operations: [],
      errors: [],
      feedback: null,
    };

    set(newState);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...get(),
        ...newState,
      }));
    } catch {
      // localStorage may be unavailable
    }
  },

  pauseGame: () => {
    set({ phase: 'paused' });
  },

  resumeGame: () => {
    set({ phase: 'playing' });
  },

  placeBond: (bondId: string, slotId: string) => {
    const state = get();
    const level = state.currentLevelId ? getLevelById(state.currentLevelId) : null;
    if (!level) return;

    const bond = bondLibrary.find(b => b.id === bondId);
    const slot = level.slots.find(s => s.id === slotId);
    if (!bond || !slot) return;

    const beforeState: Record<string, unknown> = {
      placedBonds: [...state.placedBonds],
      score: state.score,
    };

    const alreadyPlaced = state.placedBonds.find(pb => pb.bondId === bondId);
    if (alreadyPlaced) {
      set({
        feedback: {
          message: '该债券已放置，请先从槽位中取出',
          type: 'error',
          timestamp: Date.now(),
        },
      });
      return;
    }

    const checkResult = checkDurationMismatch(bond, slot);
    let newScore = state.score;

    if (checkResult.hasError) {
      const errorRecord = createErrorRecord(state.operations.length, checkResult);
      const dragScore = calculateDragScore(false, 0);
      newScore += dragScore;

      const operation: Operation = {
        timestamp: Date.now(),
        type: 'drag',
        detail: { bondId, slotId, correct: false },
        beforeState,
        afterState: {
          placedBonds: state.placedBonds,
          score: newScore,
          error: errorRecord,
        },
      };

      set({
        score: newScore,
        operations: [...state.operations, operation],
        errors: [...state.errors, errorRecord],
        feedback: {
          message: checkResult.description || '久期不匹配！',
          type: 'error',
          timestamp: Date.now(),
        },
      });
    } else {
      const timeBonus = Math.floor(state.timeRemaining / 10);
      const dragScore = calculateDragScore(true, timeBonus);
      newScore += dragScore;

      const placedBond: PlacedBond = {
        bondId,
        slotId,
        placedAt: Date.now(),
      };

      const operation: Operation = {
        timestamp: Date.now(),
        type: 'drag',
        detail: { bondId, slotId, correct: true, scoreDelta: dragScore },
        beforeState,
        afterState: {
          placedBonds: [...state.placedBonds, placedBond],
          score: newScore,
        },
      };

      const totalBonds = bondLibrary.length;
      const newPlacedCount = state.placedBonds.length + 1;

      set({
        score: newScore,
        placedBonds: [...state.placedBonds, placedBond],
        operations: [...state.operations, operation],
        feedback: {
          message: `正确！+${dragScore}分 (${newPlacedCount}/${totalBonds})`,
          type: 'success',
          timestamp: Date.now(),
        },
      });

      if (newPlacedCount >= totalBonds) {
        setTimeout(() => get().finishGame(), 500);
      }
    }
  },

  removeBond: (bondId: string) => {
    const state = get();
    const remaining = state.placedBonds.filter(pb => pb.bondId !== bondId);

    set({
      placedBonds: remaining,
      feedback: {
        message: '债券已取回',
        type: 'info',
        timestamp: Date.now(),
      },
    });
  },

  adjustCurve: (direction: 'up' | 'down' | 'flat') => {
    const state = get();
    const level = state.currentLevelId ? getLevelById(state.currentLevelId) : null;
    if (!level) return;

    const isCorrect = direction === level.yieldCurve.direction;
    const curveScore = calculateCurveScore(isCorrect);

    const operation: Operation = {
      timestamp: Date.now(),
      type: 'curve_adjust',
      detail: {
        from: state.currentCurveDirection,
        to: direction,
        correct: isCorrect,
        scoreDelta: curveScore,
      },
      beforeState: {
        currentCurveDirection: state.currentCurveDirection,
        score: state.score,
      },
      afterState: {
        currentCurveDirection: direction,
        score: state.score + curveScore,
      },
    };

    if (isCorrect) {
      set({
        score: state.score + curveScore,
        currentCurveDirection: direction,
        operations: [...state.operations, operation],
        feedback: {
          message: `曲线方向正确！+${curveScore}分`,
          type: 'success',
          timestamp: Date.now(),
        },
      });
    } else {
      const errorRecord: ErrorRecord = {
        operationIndex: state.operations.length,
        type: 'curve_direction',
        description: `收益率曲线方向错误：应为${level.yieldCurve.direction === 'up' ? '上升' : level.yieldCurve.direction === 'down' ? '下降' : '平稳'}。`,
        suggestion: level.yieldCurve.direction === 'up'
          ? '利率上升时，长久期债券价格跌幅更大，请调整曲线方向为向上平移。'
          : level.yieldCurve.direction === 'down'
          ? '利率下降时，长久期债券价格涨幅更大，请调整曲线方向为向下平移。'
          : '当前市场利率稳定，请将曲线调整为平稳状态。',
      };

      set({
        score: state.score + curveScore,
        currentCurveDirection: direction,
        operations: [...state.operations, operation],
        errors: [...state.errors, errorRecord],
        feedback: {
          message: '曲线方向错误！请参考提示重新调整。',
          type: 'error',
          timestamp: Date.now(),
        },
      });
    }
  },

  setCashFlowEstimate: (bondId: string, weights: number[]) => {
    const state = get();
    const bond = bondLibrary.find(b => b.id === bondId);
    if (!bond) return;

    const deviations = bond.cashFlows.map((cf, i) => {
      const estimated = weights[i] || 0;
      return Math.abs(estimated - cf.weight);
    });

    const cfScore = calculateCashFlowScore(deviations);

    const operation: Operation = {
      timestamp: Date.now(),
      type: 'cashflow_estimate',
      detail: {
        bondId,
        weights,
        deviations,
        scoreDelta: cfScore,
      },
      beforeState: {
        cashFlowEstimates: { ...state.cashFlowEstimates },
        score: state.score,
      },
      afterState: {
        cashFlowEstimates: { ...state.cashFlowEstimates, [bondId]: weights },
        score: state.score + cfScore,
      },
    };

    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    const maxDevIndex = deviations.indexOf(maxDeviation);

    if (cfScore > 0) {
      set({
        score: state.score + cfScore,
        cashFlowEstimates: { ...state.cashFlowEstimates, [bondId]: weights },
        operations: [...state.operations, operation],
        feedback: {
          message: `现金流权重判断正确！+${cfScore}分 (平均偏差${avgDeviation.toFixed(1)}%)`,
          type: 'success',
          timestamp: Date.now(),
        },
      });
    } else {
      const errorRecord: ErrorRecord = {
        operationIndex: state.operations.length,
        type: 'cashflow_weight',
        description: maxDeviation > 10
          ? `现金流权重误判：${bond.name}第${maxDevIndex + 1}期偏差最大（实际${bond.cashFlows[maxDevIndex].weight.toFixed(1)}%，判断${(weights[maxDevIndex] || 0).toFixed(1)}%），平均偏差${avgDeviation.toFixed(1)}%。`
          : `现金流权重判断偏差较大：${bond.name}平均偏差${avgDeviation.toFixed(1)}%。`,
        suggestion: avgDeviation > 5
          ? '票面利息占比通常较小，本金偿还期权重最大。请重新审视各期现金流的相对大小。'
          : '权重判断接近正确答案，继续调整可提高得分。',
      };

      set({
        score: state.score + cfScore,
        cashFlowEstimates: { ...state.cashFlowEstimates, [bondId]: weights },
        operations: [...state.operations, operation],
        errors: [...state.errors, errorRecord],
        feedback: {
          message: cfScore < 0
            ? `权重偏差过大！${cfScore}分 (平均偏差${avgDeviation.toFixed(1)}%)`
            : `权重判断接近但不够准确 (平均偏差${avgDeviation.toFixed(1)}%)`,
          type: cfScore < 0 ? 'error' : 'info',
          timestamp: Date.now(),
        },
      });
    }
  },

  setFeedback: (message: string, type: 'success' | 'error' | 'info') => {
    set({
      feedback: {
        message,
        type,
        timestamp: Date.now(),
      },
    });
  },

  clearFeedback: () => {
    set({ feedback: null });
  },

  tickTime: () => {
    const state = get();
    if (state.phase !== 'playing') return;

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      set({ timeRemaining: 0 });
      get().finishGame();
    } else {
      set({ timeRemaining: newTime });
    }
  },

  finishGame: () => {
    const state = get();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        phase: 'finished',
      }));
    } catch {
      // localStorage may be unavailable
    }

    set({ phase: 'finished' });
  },

  resetGame: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
    set(createInitialState());
  },

  loadSavedState: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed.phase === 'playing' || parsed.phase === 'paused') {
          set({
            ...createInitialState(),
            ...parsed,
            phase: 'paused',
          });
          return true;
        }
      }
    } catch {
      // localStorage may be unavailable
    }
    return false;
  },
}));
