import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState,
  GameSession,
  GameFunction,
  Axis,
  Step,
  Anomaly,
  SAMPLE_FUNCTIONS,
  GameResult,
} from '@/types/game';
import {
  detectAxisConfusion,
  detectIntervalReverse,
  detectInsufficientSlices,
  fixIntervalIfReversed,
} from '@/utils/anomalyDetection';
import {
  generateSlices,
  calculateVolume,
  calculateErrorPercentage,
  getAccuracyScore,
  getGrade,
} from '@/utils/calculus';

function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createStep(
  type: Step['type'],
  value: any,
  scoreImpact: number,
  description: string,
  isSimulationTrigger: boolean = false
): Step {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    value,
    scoreImpact,
    description,
    isSimulationTrigger,
  };
}

function selectRandomFunction(): GameFunction {
  const index = Math.floor(Math.random() * SAMPLE_FUNCTIONS.length);
  return SAMPLE_FUNCTIONS[index];
}

function createNewSession(customFunction?: GameFunction): GameSession {
  const gameFunction = customFunction || selectRandomFunction();
  return {
    id: generateId(),
    startTime: Date.now(),
    gameFunction,
    playerInput: {},
    steps: [],
    anomalies: [],
    status: 'playing',
    currentPhase: 'function',
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      history: [],

      startNewGame: (customFunction?: GameFunction) => {
        const session = createNewSession(customFunction);
        set({ currentSession: session });
      },

      confirmFunction: () => {
        const session = get().currentSession;
        if (!session || session.status !== 'playing' || session.currentPhase !== 'function') return;

        const step = createStep(
          'function_confirm',
          null,
          10,
          `确认函数：${session.gameFunction.displayName}`,
          false
        );

        set({
          currentSession: {
            ...session,
            steps: [...session.steps, step],
            currentPhase: 'axis',
          },
        });
      },

      selectAxis: (axis: Axis) => {
        const session = get().currentSession;
        if (!session || session.status !== 'playing') return;

        const step = createStep(
          'axis_selection',
          axis,
          20,
          `选择旋转轴：${axis.toUpperCase()}轴`,
          false
        );

        const anomaly = detectAxisConfusion(
          axis,
          session.gameFunction.correctAxis,
          step.id
        );

        const newAnomalies = anomaly
          ? [...session.anomalies, anomaly]
          : session.anomalies;

        const actualScoreImpact = anomaly ? 20 + anomaly.penalty : 20;
        step.scoreImpact = actualScoreImpact;

        set({
          currentSession: {
            ...session,
            playerInput: {
              ...session.playerInput,
              selectedAxis: axis,
            },
            steps: [...session.steps, step],
            anomalies: newAnomalies,
            currentPhase: 'interval',
          },
        });
      },

      setInterval: (start: number, end: number) => {
        const session = get().currentSession;
        if (!session || session.status !== 'playing') return;

        const rawInterval: [number, number] = [start, end];
        const step = createStep(
          'interval_setting',
          rawInterval,
          20,
          `设置积分区间：[${start}, ${end}]`,
          false
        );

        const anomaly = detectIntervalReverse(
          rawInterval,
          session.gameFunction.correctInterval,
          step.id
        );

        const newAnomalies = anomaly
          ? [...session.anomalies, anomaly]
          : session.anomalies;

        const actualScoreImpact = anomaly ? 20 + anomaly.penalty : 20;
        step.scoreImpact = actualScoreImpact;

        const fixedInterval = fixIntervalIfReversed(rawInterval);

        set({
          currentSession: {
            ...session,
            playerInput: {
              ...session.playerInput,
              interval: fixedInterval,
            },
            steps: [...session.steps, step],
            anomalies: newAnomalies,
            currentPhase: 'slice',
          },
        });
      },

      setSliceCount: (count: number) => {
        const session = get().currentSession;
        if (!session || session.status !== 'playing') return;

        const step = createStep(
          'slice_count',
          count,
          15,
          `设置切片数量：${count}片`,
          false
        );

        const anomaly = detectInsufficientSlices(count, step.id);

        const newAnomalies = anomaly
          ? [...session.anomalies, anomaly]
          : session.anomalies;

        const actualScoreImpact = anomaly ? 15 + anomaly.penalty : 15;
        step.scoreImpact = actualScoreImpact;

        set({
          currentSession: {
            ...session,
            playerInput: {
              ...session.playerInput,
              sliceCount: count,
            },
            steps: [...session.steps, step],
            anomalies: newAnomalies,
            currentPhase: 'simulation',
          },
        });
      },

      triggerSimulation: () => {
        const session = get().currentSession;
        if (!session || session.status !== 'playing') return;
        if (
          !session.playerInput.selectedAxis ||
          !session.playerInput.interval ||
          !session.playerInput.sliceCount
        )
          return;

        const step = createStep(
          'simulation_trigger',
          {
            axis: session.playerInput.selectedAxis,
            interval: session.playerInput.interval,
            sliceCount: session.playerInput.sliceCount,
          },
          0,
          '触发切片模拟与旋转生成',
          true
        );

        const slices = generateSlices(
          session.gameFunction.expr,
          session.playerInput.interval,
          session.playerInput.sliceCount,
          session.playerInput.selectedAxis
        );

        const calculatedVolume = calculateVolume(slices);
        const errorPercentage = calculateErrorPercentage(
          calculatedVolume,
          session.gameFunction.correctVolume
        );
        const accuracyScore = getAccuracyScore(errorPercentage);

        const result: GameResult = {
          totalScore: 0,
          breakdown: {
            axisScore: 0,
            intervalScore: 0,
            sliceScore: 0,
            accuracyScore,
          },
          calculatedVolume,
          errorPercentage,
          grade: 'F',
        };

        session.steps.forEach((s) => {
          if (s.type === 'axis_selection') result.breakdown.axisScore = s.scoreImpact;
          if (s.type === 'interval_setting') result.breakdown.intervalScore = s.scoreImpact;
          if (s.type === 'slice_count') result.breakdown.sliceScore = s.scoreImpact;
        });

        result.totalScore =
          result.breakdown.axisScore +
          result.breakdown.intervalScore +
          result.breakdown.sliceScore +
          result.breakdown.accuracyScore;

        result.totalScore = Math.max(0, Math.min(100, result.totalScore));
        result.grade = getGrade(result.totalScore);

        const updatedSession: GameSession = {
          ...session,
          steps: [...session.steps, step],
          result,
          endTime: Date.now(),
          status: 'completed',
          currentPhase: 'result',
        };

        set({
          currentSession: updatedSession,
          history: [...get().history, updatedSession],
        });
      },

      completeGame: () => {
        const session = get().currentSession;
        if (!session) return;

        set({
          currentSession: {
            ...session,
            status: 'completed',
            endTime: Date.now(),
          },
        });
      },

      resetGame: () => {
        set({ currentSession: null });
      },

      loadSession: (session: GameSession) => {
        set({ currentSession: session });
      },
    }),
    {
      name: 'calculus-factory-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
);

export function useCurrentScore(): number {
  const session = useGameStore((state) => state.currentSession);
  if (!session) return 0;

  const stepScore = session.steps.reduce((sum, step) => sum + step.scoreImpact, 0);
  return Math.max(0, stepScore);
}

export function useHasAnomaly(): boolean {
  const session = useGameStore((state) => state.currentSession);
  return session ? session.anomalies.length > 0 : false;
}

export function useAnomalies(): Anomaly[] {
  const session = useGameStore((state) => state.currentSession);
  return session ? session.anomalies : [];
}

export function useSteps(): Step[] {
  const session = useGameStore((state) => state.currentSession);
  return session ? session.steps : [];
}
