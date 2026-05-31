import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConditionCard, CounterExample, LogicLink, StepRecord, ScoreResult, ImportPayload, DemoCase } from '@/types/game';
import { demoCase } from '@/data/demoCase';
import { calculateScore } from '@/utils/scoring';

interface GameState {
  sessionId: string;
  theoremTitle: string;
  theoremStatement: string;
  studentProof: string;
  status: 'idle' | 'playing' | 'paused' | 'finished';
  elapsedTime: number;
  totalTime: number;
  conditions: ConditionCard[];
  counterExamples: CounterExample[];
  logicLinks: LogicLink[];
  stepRecords: StepRecord[];
  scoreResult: ScoreResult | null;
  correctLinks: DemoCase['correctLinks'];
  imports: ImportPayload[];
  linkingFrom: string | null;
  stepCounter: number;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  finishGame: () => void;
  tick: () => void;

  placeCardOnCanvas: (cardId: string, x: number, y: number) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  removeCardFromCanvas: (cardId: string) => void;

  startLinking: (fromCardId: string) => void;
  completeLink: (toCardId: string, rule: LogicLink['rule']) => void;
  cancelLinking: () => void;
  removeLink: (linkId: string) => void;
  judgeLink: (linkId: string, status: 'valid' | 'invalid') => void;

  setCounterExampleStatus: (ceId: string, status: CounterExample['status']) => void;

  importMaterials: (payload: ImportPayload) => void;

  getScoreResult: () => ScoreResult;
}

let nextStepCounter = 1;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  sessionId: `session-${Date.now()}`,
  theoremTitle: demoCase.theoremTitle,
  theoremStatement: demoCase.theoremStatement,
  studentProof: demoCase.studentProof,
  status: 'idle',
  elapsedTime: 0,
  totalTime: demoCase.totalTime,
  conditions: demoCase.conditions.map(c => ({ ...c, position: { x: 0, y: 0 } })),
  counterExamples: demoCase.counterExamples.map(ce => ({ ...ce })),
  logicLinks: [],
  stepRecords: [],
  scoreResult: null,
  correctLinks: demoCase.correctLinks,
  imports: [],
  linkingFrom: null,
  stepCounter: 0,

  startGame: () => {
    nextStepCounter = 1;
    set({
      status: 'playing',
      elapsedTime: 0,
      stepRecords: [],
      logicLinks: [],
      scoreResult: null,
      stepCounter: 0,
      sessionId: `session-${Date.now()}`,
      conditions: demoCase.conditions.map(c => ({ ...c, position: { x: 0, y: 0 } })),
      counterExamples: demoCase.counterExamples.map(ce => ({ ...ce })),
    });
  },

  pauseGame: () => {
    if (get().status === 'playing') {
      set({ status: 'paused' });
    }
  },

  resumeGame: () => {
    if (get().status === 'paused') {
      set({ status: 'playing' });
    }
  },

  resetGame: () => {
    nextStepCounter = 1;
    set({
      sessionId: `session-${Date.now()}`,
      status: 'idle',
      elapsedTime: 0,
      conditions: demoCase.conditions.map(c => ({ ...c, position: { x: 0, y: 0 } })),
      counterExamples: demoCase.counterExamples.map(ce => ({ ...ce })),
      logicLinks: [],
      stepRecords: [],
      scoreResult: null,
      linkingFrom: null,
      stepCounter: 0,
      imports: [],
    });
  },

  finishGame: () => {
    const scoreResult = get().getScoreResult();
    set({ status: 'finished', scoreResult });
  },

  tick: () => {
    const { status, elapsedTime } = get();
    if (status === 'playing') {
      set({ elapsedTime: elapsedTime + 1 });
    }
  },

  placeCardOnCanvas: (cardId, x, y) => {
    const state = get();
    if (state.status !== 'playing') return;
    set({
      conditions: state.conditions.map(c =>
        c.id === cardId ? { ...c, isOnCanvas: true, position: { x, y } } : c
      ),
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'place_card',
          actionDetail: `放置条件卡: ${cardId} 到画布 (${x}, ${y})`,
          timestamp: state.elapsedTime,
          scoreDelta: 0,
          deductionReason: null,
        },
      ],
      stepCounter: state.stepCounter + 1,
    });
  },

  moveCard: (cardId, x, y) => {
    set({
      conditions: get().conditions.map(c =>
        c.id === cardId ? { ...c, position: { x, y } } : c
      ),
    });
  },

  removeCardFromCanvas: (cardId) => {
    const state = get();
    set({
      conditions: state.conditions.map(c =>
        c.id === cardId ? { ...c, isOnCanvas: false, position: { x: 0, y: 0 } } : c
      ),
      logicLinks: state.logicLinks.filter(l => l.fromCardId !== cardId && l.toCardId !== cardId),
    });
  },

  startLinking: (fromCardId) => {
    set({ linkingFrom: fromCardId });
  },

  completeLink: (toCardId, rule) => {
    const state = get();
    if (!state.linkingFrom || state.linkingFrom === toCardId) return;

    const existing = state.logicLinks.find(
      l => l.fromCardId === state.linkingFrom && l.toCardId === toCardId
    );
    if (existing) return;

    const stepIdx = state.stepCounter + 1;
    const newLink: LogicLink = {
      id: `link-${Date.now()}`,
      fromCardId: state.linkingFrom,
      toCardId,
      status: 'pending',
      rule,
      stepIndex: stepIdx,
    };

    set({
      logicLinks: [...state.logicLinks, newLink],
      linkingFrom: null,
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'link',
          actionDetail: `连线: ${state.linkingFrom} → ${toCardId} (${rule})`,
          timestamp: state.elapsedTime,
          scoreDelta: 0,
          deductionReason: null,
        },
      ],
      stepCounter: stepIdx,
    });
  },

  cancelLinking: () => {
    set({ linkingFrom: null });
  },

  removeLink: (linkId) => {
    const state = get();
    set({
      logicLinks: state.logicLinks.filter(l => l.id !== linkId),
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'remove_link',
          actionDetail: `移除连线: ${linkId}`,
          timestamp: state.elapsedTime,
          scoreDelta: 0,
          deductionReason: null,
        },
      ],
    });
  },

  judgeLink: (linkId, status) => {
    const state = get();
    const link = state.logicLinks.find(l => l.id === linkId);
    if (!link) return;

    const isCorrect = state.correctLinks.some(
      cl => cl.fromCardId === link.fromCardId && cl.toCardId === link.toCardId
    );
    const actualStatus = isCorrect ? 'valid' : 'invalid';
    const scoreDelta = actualStatus === 'valid' ? 10 : -5;

    set({
      logicLinks: state.logicLinks.map(l =>
        l.id === linkId ? { ...l, status: actualStatus } : l
      ),
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'judge',
          actionDetail: `判定连线: ${linkId} → ${actualStatus}${status !== actualStatus ? `（玩家判定为${status}，实际为${actualStatus}）` : ''}`,
          timestamp: state.elapsedTime,
          scoreDelta,
          deductionReason: actualStatus === 'invalid' ? '逻辑连线错误：推理关系不成立' : null,
        },
      ],
    });
  },

  setCounterExampleStatus: (ceId, status) => {
    const state = get();
    const ce = state.counterExamples.find(e => e.id === ceId);
    const scoreDelta = status === 'excluded' ? 15 : status === 'unexcluded' ? -10 : 0;

    set({
      counterExamples: state.counterExamples.map(ce =>
        ce.id === ceId ? { ...ce, status } : ce
      ),
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'exclude',
          actionDetail: `证据判定: ${ceId} → ${status}${ce ? ` (${ce.content.substring(0, 30)}...)` : ''}`,
          timestamp: state.elapsedTime,
          scoreDelta,
          deductionReason: status === 'unexcluded' ? '反例未排除，可能揭示证明缺陷' : null,
        },
      ],
    });
  },

  importMaterials: (payload) => {
    const state = get();
    set({
      imports: [...state.imports, payload],
      stepRecords: [
        ...state.stepRecords,
        {
          id: `step-${nextStepCounter++}`,
          actionType: 'import',
          actionDetail: `导入材料: ${payload.type} (来源: ${payload.metadata.source})`,
          timestamp: state.elapsedTime,
          scoreDelta: 0,
          deductionReason: null,
        },
      ],
    });
  },

  getScoreResult: () => {
    const state = get();
    return calculateScore(
      state.logicLinks,
      state.counterExamples,
      state.correctLinks,
      state.conditions,
      state.stepRecords,
      state.elapsedTime,
      state.totalTime
    );
  },
}),
    {
      name: 'math-proof-court-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        theoremTitle: state.theoremTitle,
        theoremStatement: state.theoremStatement,
        studentProof: state.studentProof,
        status: state.status,
        elapsedTime: state.elapsedTime,
        totalTime: state.totalTime,
        conditions: state.conditions,
        counterExamples: state.counterExamples,
        logicLinks: state.logicLinks,
        stepRecords: state.stepRecords,
        scoreResult: state.scoreResult,
        correctLinks: state.correctLinks,
        imports: state.imports,
        stepCounter: state.stepCounter,
      }),
    }
  )
);
