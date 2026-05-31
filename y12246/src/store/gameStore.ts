import { create } from 'zustand';
import { GameState, GameActions, OperationTrace } from '../types';
import { levels, getLevelById } from '../data/levels';
import { applyEventToCashFlow, calculateScore } from '../utils/rulesEngine';

type GameStore = GameState & GameActions;

const initialState: GameState = {
  currentLevelId: null,
  currentDateIndex: 0,
  cashFlows: [],
  activeEvent: null,
  traces: [],
  score: 0,
  isGameOver: false,
  isPaused: false,
  selectedAnswers: {},
  replayMode: false,
  replayStep: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startLevel: (levelId: string) => {
    const level = getLevelById(levelId);
    if (!level) return;

    set({
      currentLevelId: levelId,
      currentDateIndex: 0,
      cashFlows: JSON.parse(JSON.stringify(level.initialCashFlows)),
      activeEvent: null,
      traces: [],
      score: 0,
      isGameOver: false,
      isPaused: false,
      selectedAnswers: {},
      replayMode: false,
      replayStep: 0,
    });

    const startTrace: OperationTrace = {
      id: `trace-start-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'system_judge',
      content: `开始游戏：${level.name}`,
      source: 'system',
      isCorrect: true,
      details: `债券：${level.bondCard.name}，共${level.events.length}个事件`,
    };
    set(state => ({ traces: [...state.traces, startTrace] }));
  },

  advanceTimeline: () => {
    const state = get();
    const level = getLevelById(state.currentLevelId || '');
    if (!level || state.isGameOver) return;

    const nextIndex = state.currentDateIndex + 1;

    if (nextIndex >= level.timelineDates.length) {
      const totalEvents = level.events.length;
      const correctAnswers = Object.values(state.selectedAnswers).filter(
        (answer, index) => answer === level.events[index]?.correctOptionIndex
      ).length;
      const finalScore = calculateScore(totalEvents, correctAnswers, true);

      set({
        isGameOver: true,
        score: finalScore,
        activeEvent: null,
      });

      const endTrace: OperationTrace = {
        id: `trace-end-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'system_judge',
        content: `游戏结束，最终得分：${finalScore}分`,
        source: 'system',
        isCorrect: finalScore >= level.targetScore,
        details: `正确：${correctAnswers}/${totalEvents}，目标分数：${level.targetScore}`,
      };
      set(s => ({ traces: [...s.traces, endTrace] }));
      return;
    }

    const currentDate = level.timelineDates[nextIndex];
    const eventAtDate = level.events.find(e => e.date === currentDate);

    if (eventAtDate && !state.selectedAnswers[eventAtDate.id]) {
      const eventTrace: OperationTrace = {
        id: `trace-event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'event_trigger',
        content: `触发事件：${eventAtDate.title}`,
        source: 'announcement',
        details: `日期：${currentDate}`,
      };

      set({
        currentDateIndex: nextIndex,
        activeEvent: eventAtDate,
        traces: [...state.traces, eventTrace],
      });
    } else {
      set({ currentDateIndex: nextIndex });
    }
  },

  selectCashFlow: (cellId: string) => {
    const state = get();
    const cashFlows = state.cashFlows.map(cf =>
      cf.id === cellId ? { ...cf, isSelected: !cf.isSelected } : cf
    );

    const selectedCF = cashFlows.find(cf => cf.id === cellId);
    if (selectedCF) {
      const trace: OperationTrace = {
        id: `trace-cf-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'user_action',
        content: `${selectedCF.isSelected ? '选中' : '取消选中'}现金流格`,
        source: 'cash_flow',
        details: `第${selectedCF.period}期，金额：${selectedCF.expectedAmount}元`,
      };
      set({ cashFlows, traces: [...state.traces, trace] });
    } else {
      set({ cashFlows });
    }
  },

  handleEventAnswer: (eventId: string, optionIndex: number) => {
    const state = get();
    const level = getLevelById(state.currentLevelId || '');
    const event = state.activeEvent;

    if (!event || event.id !== eventId || !level) return;

    const { updatedCashFlows, trace, isCorrect } = applyEventToCashFlow(
      state.cashFlows,
      event,
      optionIndex
    );

    set({
      cashFlows: updatedCashFlows,
      selectedAnswers: { ...state.selectedAnswers, [eventId]: optionIndex },
      traces: [...state.traces, trace],
      activeEvent: null,
      score: isCorrect ? state.score + 10 : state.score,
    });
  },

  endGame: () => {
    const state = get();
    const level = getLevelById(state.currentLevelId || '');
    if (!level) return;

    const totalEvents = level.events.length;
    const correctAnswers = Object.values(state.selectedAnswers).filter(
      (answer, index) => answer === level.events[index]?.correctOptionIndex
    ).length;
    const finalScore = calculateScore(totalEvents, correctAnswers, false);

    set({
      isGameOver: true,
      score: finalScore,
      activeEvent: null,
    });
  },

  resetGame: () => {
    set(initialState);
  },

  togglePause: () => {
    set(state => ({ isPaused: !state.isPaused }));
  },

  startReplay: () => {
    set({ replayMode: true, replayStep: 0 });
  },

  replayNextStep: () => {
    const state = get();
    const maxSteps = state.traces.length;
    if (state.replayStep < maxSteps - 1) {
      set({ replayStep: state.replayStep + 1 });
    }
  },

  replayPrevStep: () => {
    const state = get();
    if (state.replayStep > 0) {
      set({ replayStep: state.replayStep - 1 });
    }
  },
}));

export const useCurrentLevel = () => {
  const levelId = useGameStore(state => state.currentLevelId);
  return levelId ? getLevelById(levelId) : null;
};

export { levels };
