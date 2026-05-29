import { create } from 'zustand';
import type {
  GameState,
  Difficulty,
  Decision,
  ConversationCard,
  DecisionRecord,
  ResultStats,
  ErrorType,
} from '@/types';
import { gameEngine } from '@/game/gameEngine';

interface GameStore extends GameState {
  resultStats: ResultStats | null;
  lastFeedback: {
    isCorrect: boolean;
    scoreChange: number;
    details: string | null;
    errorType: ErrorType | null;
  } | null;
  showFeedback: boolean;
  initGame: (difficulty: Difficulty, cardCount?: number) => void;
  makeDecision: (decision: Decision) => void;
  nextCard: () => void;
  hideFeedback: () => void;
  resetGame: () => void;
  calculateResults: () => void;
  setCurrentHint: (hint: string | null) => void;
  getCurrentCard: () => ConversationCard | null;
  getProgress: () => number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  currentCardIndex: 0,
  cards: [],
  decisionRecords: [],
  score: 0,
  totalScore: 0,
  resources: {
    totalAgents: 10,
    busyAgents: 4,
    queueLength: 2,
    avgWaitTime: 3,
    busyLevel: 'medium',
  },
  startTime: null,
  difficulty: 'medium',
  currentHint: null,
  resultStats: null,
  lastFeedback: null,
  showFeedback: false,

  initGame: (difficulty: Difficulty, cardCount: number = 10) => {
    const { cards, resources } = gameEngine.initGame(difficulty, cardCount);
    const totalScore = cards.reduce((sum, card) => {
      const base = card.difficulty === 'hard' ? 20 : card.difficulty === 'medium' ? 15 : 10;
      return sum + base;
    }, 0);

    gameEngine.startCardTimer();

    set({
      status: 'playing',
      currentCardIndex: 0,
      cards,
      decisionRecords: [],
      score: 0,
      totalScore,
      resources,
      startTime: Date.now(),
      difficulty,
      currentHint: null,
      resultStats: null,
      lastFeedback: null,
      showFeedback: false,
    });
  },

  makeDecision: (decision: Decision) => {
    const state = get();
    if (state.status !== 'playing') return;

    const currentCard = state.cards[state.currentCardIndex];
    if (!currentCard) return;

    const { record, scoreChange, newResources, hint } = gameEngine.processDecision(
      currentCard,
      decision,
      state.resources
    );

    const newScore = Math.max(0, state.score + scoreChange);
    const newRecords = [...state.decisionRecords, record];

    set({
      decisionRecords: newRecords,
      score: newScore,
      resources: newResources,
      currentHint: hint,
      lastFeedback: {
        isCorrect: record.isCorrect,
        scoreChange,
        details: record.errorDetails,
        errorType: record.errorType,
      },
      showFeedback: true,
    });

    if (state.currentCardIndex >= state.cards.length - 1) {
      const finalStats = gameEngine.calculateStats(
        newRecords,
        newScore,
        state.cards.length
      );
      setTimeout(() => {
        set({
          status: 'finished',
          resultStats: finalStats,
          showFeedback: false,
        });
      }, 1500);
    }
  },

  nextCard: () => {
    const state = get();
    if (state.currentCardIndex < state.cards.length - 1) {
      gameEngine.startCardTimer();
      set({
        currentCardIndex: state.currentCardIndex + 1,
        showFeedback: false,
        lastFeedback: null,
        currentHint: null,
      });
    }
  },

  hideFeedback: () => {
    set({ showFeedback: false });
  },

  resetGame: () => {
    set({
      status: 'idle',
      currentCardIndex: 0,
      cards: [],
      decisionRecords: [],
      score: 0,
      totalScore: 0,
      resources: {
        totalAgents: 10,
        busyAgents: 4,
        queueLength: 2,
        avgWaitTime: 3,
        busyLevel: 'medium',
      },
      startTime: null,
      difficulty: 'medium',
      currentHint: null,
      resultStats: null,
      lastFeedback: null,
      showFeedback: false,
    });
  },

  calculateResults: () => {
    const state = get();
    const stats = gameEngine.calculateStats(
      state.decisionRecords,
      state.score,
      state.cards.length
    );
    set({ resultStats: stats, status: 'finished' });
  },

  setCurrentHint: (hint: string | null) => {
    set({ currentHint: hint });
  },

  getCurrentCard: () => {
    const state = get();
    return state.cards[state.currentCardIndex] || null;
  },

  getProgress: () => {
    const state = get();
    if (state.cards.length === 0) return 0;
    return ((state.currentCardIndex + 1) / state.cards.length) * 100;
  },
}));
