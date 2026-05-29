import { create } from 'zustand';
import type {
  QuantumState,
  MeasurementBasis,
  MeasurementResult,
  PendingConfirmation,
  TimelineEntry,
  TraceIndex,
  FeedbackMessage,
  WarningType,
} from '@/types/quantum';
import {
  PRESET_STATES,
  PRESET_BASES,
  performMeasurement,
  measureProbabilities,
  checkNormalization,
} from '@/utils/quantum';

interface GameState {
  sessionId: string;
  states: QuantumState[];
  bases: MeasurementBasis[];
  results: MeasurementResult[];
  warnings: PendingConfirmation[];
  timeline: TimelineEntry[];
  traceIndex: TraceIndex;

  selectedStateId: string | null;
  selectedBasisId: string | null;
  currentProbabilities: number[] | null;
  currentProbNormalized: boolean | null;

  feedbacks: FeedbackMessage[];
  isMeasuring: boolean;
  gameEnded: boolean;
  stepCounter: number;
  lastBasisId: string | null;

  initGame: () => void;
  selectState: (stateId: string) => void;
  selectBasis: (basisId: string) => void;
  triggerMeasure: (seed?: number) => void;
  confirmWarning: (warningId: string) => void;
  dismissFeedback: (feedbackId: string) => void;
  endGame: () => void;
  resetGame: () => void;
}

function buildTraceIndex(
  results: MeasurementResult[]
): TraceIndex {
  const forward: Record<string, string[]> = {};
  const backward: Record<string, { stateId: string; basisId: string; stepIndex: number }> = {};

  for (const r of results) {
    if (!forward[r.stateId]) forward[r.stateId] = [];
    forward[r.stateId].push(r.id);
    backward[r.id] = { stateId: r.stateId, basisId: r.basisId, stepIndex: r.stepIndex };
  }

  return { forward, backward };
}

function addFeedback(
  feedbacks: FeedbackMessage[],
  type: FeedbackMessage['type'],
  title: string,
  detail: string
): FeedbackMessage[] {
  const fb: FeedbackMessage = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type,
    title,
    detail,
    timestamp: Date.now(),
  };
  return [fb, ...feedbacks].slice(0, 5);
}

function checkWarnings(
  state: QuantumState,
  basis: MeasurementBasis,
  results: MeasurementResult[],
  lastBasisId: string | null,
  stepCounter: number
): PendingConfirmation[] {
  const warnings: PendingConfirmation[] = [];

  const probs = measureProbabilities(state, basis);
  if (!checkNormalization(probs)) {
    warnings.push({
      id: `warn-norm-${stepCounter}-${state.id}-${basis.id}`,
      type: 'PROBABILITY_NOT_NORMALIZED' as WarningType,
      message: '概率未归一',
      detail: `当前概率之和为 ${probs.reduce((a, b) => a + b, 0).toFixed(4)}，偏离 1。请检查量子态振幅是否正确，否则科普社老师后续需要返工修正。`,
      relatedIds: [state.id, basis.id],
      confirmed: false,
      createdAt: Date.now(),
    });
  }

  if (lastBasisId && lastBasisId !== basis.id) {
    warnings.push({
      id: `warn-basis-${stepCounter}-${basis.id}-${lastBasisId}`,
      type: 'BASIS_CONFUSION' as WarningType,
      message: '测量基混淆',
      detail: `上一次使用${lastBasisId === 'basis-z' ? 'Z基' : lastBasisId === 'basis-x' ? 'X基' : 'Y基'}，本次切换为${basis.label}。连续不同基测量时，态已被上次塌缩改变，请确认是否为有意操作。`,
      relatedIds: [basis.id],
      confirmed: false,
      createdAt: Date.now(),
    });
  }

  const hasHistory = results.some(
    (r) => r.stateId === state.id && r.basisId === basis.id
  );
  if (hasHistory) {
    warnings.push({
      id: `warn-history-${stepCounter}-${state.id}-${basis.id}`,
      type: 'NO_EXPERIMENT_HISTORY' as WarningType,
      message: '重复实验无历史',
      detail: `对${state.label}使用${basis.label}已有测量记录，但每次测量独立——上次结果不影响本次概率分布。请确认理解量子测量的独立性。`,
      relatedIds: [state.id, basis.id],
      confirmed: false,
      createdAt: Date.now(),
    });
  }

  return warnings;
}

export const useGameStore = create<GameState>((set, get) => ({
  sessionId: `session-${Date.now()}`,
  states: PRESET_STATES,
  bases: PRESET_BASES,
  results: [],
  warnings: [],
  timeline: [],
  traceIndex: { forward: {}, backward: {} },

  selectedStateId: null,
  selectedBasisId: null,
  currentProbabilities: null,
  currentProbNormalized: null,

  feedbacks: [],
  isMeasuring: false,
  gameEnded: false,
  stepCounter: 0,
  lastBasisId: null,

  initGame: () => {
    const states = PRESET_STATES;
    const bases = PRESET_BASES;
    const timeline: TimelineEntry[] = [];
    let step = 0;

    for (const s of states) {
      timeline.push({
        stepIndex: step++,
        type: 'IMPORT_STATE',
        entityId: s.id,
        description: `导入量子态 ${s.label}（${s.importTag} #${s.importOrder}）`,
      });
    }
    for (const b of bases) {
      timeline.push({
        stepIndex: step++,
        type: 'IMPORT_BASIS',
        entityId: b.id,
        description: `导入测量基 ${b.label}（${b.importTag} #${b.importOrder}）`,
      });
    }
    timeline.push({
      stepIndex: step++,
      type: 'IMPORT_PROBABILITY',
      entityId: 'prob-initial',
      description: '概率条占位已创建，等待数据填充',
    });

    set({
      sessionId: `session-${Date.now()}`,
      states,
      bases,
      results: [],
      warnings: [],
      timeline,
      traceIndex: { forward: {}, backward: {} },
      selectedStateId: null,
      selectedBasisId: null,
      currentProbabilities: null,
      currentProbNormalized: null,
      feedbacks: addFeedback([], 'info', '对局开始', '量子态卡和测量基已就位，请选择要测量的量子态。'),
      isMeasuring: false,
      gameEnded: false,
      stepCounter: step,
      lastBasisId: null,
    });
  },

  selectState: (stateId: string) => {
    const { states, bases, selectedBasisId, feedbacks } = get();
    const state = states.find((s) => s.id === stateId);
    if (!state) return;

    let currentProbabilities: number[] | null = null;
    let currentProbNormalized: boolean | null = null;

    if (selectedBasisId) {
      const basis = bases.find((b) => b.id === selectedBasisId);
      if (basis) {
        currentProbabilities = measureProbabilities(state, basis);
        currentProbNormalized = checkNormalization(currentProbabilities);
      }
    }

    set({
      selectedStateId: stateId,
      currentProbabilities,
      currentProbNormalized,
      feedbacks: addFeedback(feedbacks, 'info', `选中 ${state.label}`, `已选择量子态 ${state.label}，请选择测量基。`),
    });
  },

  selectBasis: (basisId: string) => {
    const { states, bases, selectedStateId, feedbacks, stepCounter, timeline } = get();
    const basis = bases.find((b) => b.id === basisId);
    if (!basis) return;

    let currentProbabilities: number[] | null = null;
    let currentProbNormalized: boolean | null = null;

    if (selectedStateId) {
      const state = states.find((s) => s.id === selectedStateId);
      if (state) {
        currentProbabilities = measureProbabilities(state, basis);
        currentProbNormalized = checkNormalization(currentProbabilities);
      }
    }

    const newTimeline = [
      ...timeline,
      {
        stepIndex: stepCounter,
        type: 'SELECT_BASIS' as const,
        entityId: basisId,
        description: `选择测量基 ${basis.label}`,
      },
    ];

    set({
      selectedBasisId: basisId,
      currentProbabilities,
      currentProbNormalized,
      timeline: newTimeline,
      stepCounter: stepCounter + 1,
      feedbacks: addFeedback(
        feedbacks,
        'info',
        `选择 ${basis.label}`,
        currentProbabilities
          ? `概率分布: ${currentProbabilities.map((p, i) => `${basis.eigenvectors[i]?.label}: ${(p * 100).toFixed(1)}%`).join('  ')}`
          : '请先选择量子态'
      ),
    });
  },

  triggerMeasure: (seed?: number) => {
    const {
      states,
      bases,
      selectedStateId,
      selectedBasisId,
      results,
      timeline,
      stepCounter,
      lastBasisId,
      feedbacks,
    } = get();

    if (!selectedStateId || !selectedBasisId) {
      set({
        feedbacks: addFeedback(feedbacks, 'error', '无法测量', '请先选择量子态和测量基。'),
      });
      return;
    }

    const state = states.find((s) => s.id === selectedStateId);
    const basis = bases.find((b) => b.id === selectedBasisId);
    if (!state || !basis) return;

    const newWarnings = checkWarnings(state, basis, results, lastBasisId, stepCounter);
    const unconfirmedWarnings = newWarnings.filter((w) => !w.confirmed);
    if (unconfirmedWarnings.length > 0) {
      set({
        warnings: [...get().warnings, ...newWarnings],
        feedbacks: addFeedback(
          feedbacks,
          'error',
          '待确认项未通过',
          `有 ${unconfirmedWarnings.length} 项警告需要确认后才能继续测量。`
        ),
      });
      return;
    }

    set({ isMeasuring: true });

    setTimeout(() => {
      const result = performMeasurement(state, basis, stepCounter, seed);

      const newTimeline = [
        ...get().timeline,
        {
          stepIndex: stepCounter,
          type: 'MEASURE' as const,
          entityId: result.id,
          description: `测量 ${state.label}（${basis.label}）→ ${result.outcomeLabel}`,
          randomSeed: result.randomSeed,
          seedInfluence: result.seedInfluence,
        },
      ];

      const newResults = [...get().results, result];
      const newTraceIndex = buildTraceIndex(newResults);

      const isCorrect =
        (state.label === '|0⟩' && result.outcomeLabel === '|0⟩') ||
        (state.label === '|1⟩' && result.outcomeLabel === '|1⟩') ||
        (state.label === '|+⟩' && (result.outcomeLabel === '|+⟩' || result.outcomeLabel === '|−⟩')) ||
        (state.label === '|−⟩' && (result.outcomeLabel === '|+⟩' || result.outcomeLabel === '|−⟩'));

      set({
        results: newResults,
        timeline: newTimeline,
        traceIndex: newTraceIndex,
        stepCounter: stepCounter + 1,
        isMeasuring: false,
        lastBasisId: selectedBasisId,
        feedbacks: addFeedback(
          get().feedbacks,
          isCorrect ? 'success' : 'info',
          `测量结果: ${result.outcomeLabel}`,
          result.seedInfluence
        ),
      });
    }, 1200);
  },

  confirmWarning: (warningId: string) => {
    const { warnings, timeline, stepCounter, feedbacks } = get();
    const newWarnings = warnings.map((w) =>
      w.id === warningId ? { ...w, confirmed: true } : w
    );
    const warning = warnings.find((w) => w.id === warningId);

    const newTimeline = warning
      ? [
          ...timeline,
          {
            stepIndex: stepCounter,
            type: 'CONFIRM_WARNING' as const,
            entityId: warningId,
            description: `确认警告: ${warning.message}`,
          },
        ]
      : timeline;

    set({
      warnings: newWarnings,
      timeline: newTimeline,
      stepCounter: warning ? stepCounter + 1 : stepCounter,
      feedbacks: addFeedback(
        feedbacks,
        'info',
        '警告已确认',
        warning ? warning.message + ' — 已确认，可继续操作。' : ''
      ),
    });
  },

  dismissFeedback: (feedbackId: string) => {
    set({ feedbacks: get().feedbacks.filter((f) => f.id !== feedbackId) });
  },

  endGame: () => {
    set({
      gameEnded: true,
      feedbacks: addFeedback(
        get().feedbacks,
        'info',
        '对局结束',
        `共进行 ${get().results.length} 次测量，可进入回溯面板查看详情。`
      ),
    });
  },

  resetGame: () => {
    get().initGame();
  },
}));
