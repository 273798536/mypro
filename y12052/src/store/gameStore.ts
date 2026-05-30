import { create } from 'zustand';
import type {
  GameStore,
  Position,
  WarningLevel,
  OperationRecord,
  ErrorRecord,
  ConflictRecord,
} from '@/types/game';
import {
  INITIAL_RADAR_BLOCKS,
  TARGET_WIND_DIRECTION,
  TARGET_WARNING_LEVEL,
  TARGET_WARNING_TIME,
  MAX_SCORE,
  SCORING_RULES,
  ERROR_DEDUCTIONS,
} from '@/data/mockData';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getInitialState = () => ({
  phase: 'idle' as const,
  score: MAX_SCORE,
  maxScore: MAX_SCORE,
  radarBlocks: JSON.parse(JSON.stringify(INITIAL_RADAR_BLOCKS)),
  windDirection: 0,
  targetWindDirection: TARGET_WIND_DIRECTION,
  warningLevel: 'none' as WarningLevel,
  warningTime: 0,
  targetWarningLevel: TARGET_WARNING_LEVEL,
  targetWarningTime: TARGET_WARNING_TIME,
  operationHistory: [] as OperationRecord[],
  errors: [] as ErrorRecord[],
  conflicts: [] as ConflictRecord[],
  startTime: null as number | null,
  currentStep: -1,
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...getInitialState(),

  startGame: () => {
    set({
      ...getInitialState(),
      phase: 'playing',
      startTime: Date.now(),
    });
  },

  resetGame: () => {
    set(getInitialState());
  },

  placeRadarBlock: (blockId: string, position: Position) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const block = state.radarBlocks.find((b) => b.id === blockId);
    if (!block) return;

    const isCorrect =
      position.x === block.targetPosition.x && position.y === block.targetPosition.y;

    const newErrors: ErrorRecord[] = [...state.errors];
    const newConflicts: ConflictRecord[] = [...state.conflicts];

    if (!isCorrect) {
      const error: ErrorRecord = {
        id: generateId(),
        type: 'cloud-mismatch',
        operationId: generateId(),
        description: `${block.label}放置位置错误，正确位置应为(${block.targetPosition.x + 1}, ${block.targetPosition.y + 1})`,
        severity: 'high',
        deduction: ERROR_DEDUCTIONS['cloud-mismatch'].high,
        timestamp: Date.now(),
      };
      newErrors.push(error);
    }

    const radarABlocks = state.radarBlocks.filter(
      (b) => b.dataSource === 'radar-a' && b.isPlaced
    );
    const radarBBlocks = state.radarBlocks.filter(
      (b) => b.dataSource === 'radar-b' && b.isPlaced
    );

    if (radarABlocks.length > 0 && radarBBlocks.length > 0 && Math.random() > 0.7) {
      const conflict: ConflictRecord = {
        id: generateId(),
        type: 'radar-wind-mismatch',
        sourceA: '雷达A数据源',
        sourceB: '雷达B数据源',
        description: '两套雷达数据在云团移动方向上存在差异，请人工核实',
        timestamp: Date.now(),
      };
      newConflicts.push(conflict);
    }

    const newRadarBlocks = state.radarBlocks.map((b) =>
      b.id === blockId ? { ...b, position, isPlaced: true, isCorrect } : b
    );

    const operation: OperationRecord = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'drag',
      detail: { blockId, position, blockLabel: block.label },
      triggeredMatch: isCorrect,
      gameStateSnapshot: {
        radarBlocks: newRadarBlocks,
        windDirection: state.windDirection,
        warningLevel: state.warningLevel,
        warningTime: state.warningTime,
      },
    };

    const totalDeduction = newErrors.reduce((sum, e) => sum + e.deduction, 0);

    set({
      radarBlocks: newRadarBlocks,
      errors: newErrors,
      conflicts: newConflicts,
      operationHistory: [...state.operationHistory, operation],
      score: Math.max(0, MAX_SCORE - totalDeduction),
    });
  },

  setWindDirection: (direction: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const angleDiff = Math.abs(direction - state.targetWindDirection);
    const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
    const isCorrect = normalizedDiff <= 30;
    const isReverse = Math.abs(normalizedDiff - 180) <= 30;

    const newErrors: ErrorRecord[] = [...state.errors];

    if (isReverse) {
      const error: ErrorRecord = {
        id: generateId(),
        type: 'wind-reverse',
        operationId: generateId(),
        description: `风向判断完全相反！当前${direction}°，正确方向约为${state.targetWindDirection}°（东南风）`,
        severity: 'high',
        deduction: ERROR_DEDUCTIONS['wind-reverse'].high,
        timestamp: Date.now(),
      };
      newErrors.push(error);
    } else if (!isCorrect) {
      const error: ErrorRecord = {
        id: generateId(),
        type: 'wind-reverse',
        operationId: generateId(),
        description: `风向偏差${normalizedDiff.toFixed(0)}°，超出±30°允许范围`,
        severity: 'medium',
        deduction: ERROR_DEDUCTIONS['wind-reverse'].medium,
        timestamp: Date.now(),
      };
      newErrors.push(error);
    }

    const operation: OperationRecord = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'rotate',
      detail: { direction, targetDirection: state.targetWindDirection, isCorrect },
      triggeredMatch: isCorrect,
      gameStateSnapshot: {
        radarBlocks: state.radarBlocks,
        windDirection: direction,
        warningLevel: state.warningLevel,
        warningTime: state.warningTime,
      },
    };

    const totalDeduction = newErrors.reduce((sum, e) => sum + e.deduction, 0);

    set({
      windDirection: direction,
      errors: newErrors,
      operationHistory: [...state.operationHistory, operation],
      score: Math.max(0, MAX_SCORE - totalDeduction),
    });
  },

  setWarning: (level: WarningLevel, time: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const levelCorrect = level === state.targetWarningLevel;
    const timeDiff = Math.abs(time - state.targetWarningTime);
    const timeCorrect = timeDiff <= 2;

    const newErrors: ErrorRecord[] = [...state.errors];

    if (!levelCorrect) {
      const error: ErrorRecord = {
        id: generateId(),
        type: time < state.targetWarningTime ? 'warning-early' : 'warning-late',
        operationId: generateId(),
        description: `预警级别错误，当前选择${level}，正确应为${state.targetWarningLevel}`,
        severity: 'medium',
        deduction: ERROR_DEDUCTIONS['warning-early'].medium,
        timestamp: Date.now(),
      };
      newErrors.push(error);
    }

    if (!timeCorrect) {
      const isEarly = time < state.targetWarningTime;
      const error: ErrorRecord = {
        id: generateId(),
        type: isEarly ? 'warning-early' : 'warning-late',
        operationId: generateId(),
        description: `预警发布${isEarly ? '过早' : '过晚'}${timeDiff}小时`,
        severity: timeDiff > 4 ? 'high' : 'medium',
        deduction: timeDiff > 4 ? ERROR_DEDUCTIONS['warning-early'].high : ERROR_DEDUCTIONS['warning-early'].medium,
        timestamp: Date.now(),
      };
      newErrors.push(error);
    }

    const operation: OperationRecord = {
      id: generateId(),
      timestamp: Date.now(),
      type: 'warning',
      detail: { level, time, levelCorrect, timeCorrect },
      triggeredMatch: levelCorrect && timeCorrect,
      gameStateSnapshot: {
        radarBlocks: state.radarBlocks,
        windDirection: state.windDirection,
        warningLevel: level,
        warningTime: time,
      },
    };

    const totalDeduction = newErrors.reduce((sum, e) => sum + e.deduction, 0);

    set({
      warningLevel: level,
      warningTime: time,
      errors: newErrors,
      operationHistory: [...state.operationHistory, operation],
      score: Math.max(0, MAX_SCORE - totalDeduction),
    });
  },

  submitGame: () => {
    const state = get();
    if (state.phase !== 'playing') return;

    set({
      phase: 'finished',
    });
  },

  replayOperation: (stepIndex: number) => {
    const state = get();
    if (stepIndex < 0 || stepIndex >= state.operationHistory.length) return;

    const operation = state.operationHistory[stepIndex];
    const snapshot = operation.gameStateSnapshot;

    set({
      currentStep: stepIndex,
      radarBlocks: snapshot.radarBlocks,
      windDirection: snapshot.windDirection,
      warningLevel: snapshot.warningLevel,
      warningTime: snapshot.warningTime,
    });
  },
}));

export const calculateCloudMatchRate = (): number => {
  const state = useGameStore.getState();
  const placedBlocks = state.radarBlocks.filter((b) => b.isPlaced);
  if (placedBlocks.length === 0) return 0;
  const correctBlocks = placedBlocks.filter((b) => b.isCorrect);
  return (correctBlocks.length / placedBlocks.length) * 100;
};

export const isWindCorrect = (): boolean => {
  const state = useGameStore.getState();
  const angleDiff = Math.abs(state.windDirection - state.targetWindDirection);
  const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
  return normalizedDiff <= 30;
};

export const isWarningCorrect = (): boolean => {
  const state = useGameStore.getState();
  const levelCorrect = state.warningLevel === state.targetWarningLevel;
  const timeDiff = Math.abs(state.warningTime - state.targetWarningTime);
  const timeCorrect = timeDiff <= 2;
  return levelCorrect && timeCorrect;
};
