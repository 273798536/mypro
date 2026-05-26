import { create } from 'zustand';
import type { Card, Difficulty, GameState, PlayerAction } from '@/types';
import { generateCards } from '@/utils/cardGenerator';
import { getErrors } from '@/utils/ruleEngine';
import { calculateScore } from '@/utils/scoreSystem';
import { DIFFICULTY_CONFIG } from '@/data/gameConfig';

interface GameStore {
  gameState: GameState;
  currentCard: Card | null;
  
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  submitAction: (action: Omit<PlayerAction, 'timestamp' | 'errors' | 'scoreChange'>) => {
    errors: string[];
    scoreChange: number;
    correctAnswer: {
      materialType: string;
      securityLevel: string;
      retentionPeriod: string;
      isBorrowRegistered: boolean;
    };
  };
  nextCard: () => boolean;
  finishGame: () => string | null;
  resetGame: () => void;
  tickTimer: () => number;
  setCurrentReportId: (id: string | null) => void;
}

const initialState: GameState = {
  status: 'idle',
  difficulty: 'normal',
  currentCardIndex: 0,
  cards: [],
  actions: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  startTime: null,
  endTime: null,
  timeLimit: 360,
  remainingTime: 360,
  currentReportId: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initialState,
  currentCard: null,

  startGame: (difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const cards = generateCards(difficulty);
    
    set({
      gameState: {
        ...initialState,
        status: 'playing',
        difficulty,
        cards,
        timeLimit: config.timeLimit,
        remainingTime: config.timeLimit,
        startTime: Date.now(),
      },
      currentCard: cards[0] || null,
    });
  },

  pauseGame: () => {
    const { gameState } = get();
    if (gameState.status === 'playing') {
      set({
        gameState: {
          ...gameState,
          status: 'paused',
        },
      });
    }
  },

  resumeGame: () => {
    const { gameState } = get();
    if (gameState.status === 'paused') {
      set({
        gameState: {
          ...gameState,
          status: 'playing',
        },
      });
    }
  },

  submitAction: (action) => {
    const { gameState, currentCard } = get();
    
    if (!currentCard || gameState.status !== 'playing') {
      return { errors: [], scoreChange: 0, correctAnswer: { materialType: '', securityLevel: '', retentionPeriod: '', isBorrowRegistered: false } };
    }

    const errors = getErrors(currentCard, action);
    const { scoreChange, newCombo } = calculateScore(errors, gameState.combo);
    
    const playerAction: PlayerAction = {
      ...action,
      timestamp: Date.now(),
      errors,
      scoreChange,
    };

    const correctAnswer = {
      materialType: currentCard.materialType,
      securityLevel: currentCard.correctSecurityLevel,
      retentionPeriod: currentCard.correctRetentionPeriod,
      isBorrowRegistered: currentCard.hasBorrowRequest,
    };

    set({
      gameState: {
        ...gameState,
        actions: [...gameState.actions, playerAction],
        score: gameState.score + scoreChange,
        combo: newCombo,
        maxCombo: Math.max(gameState.maxCombo, newCombo),
      },
    });

    return { errors, scoreChange, correctAnswer };
  },

  nextCard: () => {
    const { gameState } = get();
    const nextIndex = gameState.currentCardIndex + 1;
    
    if (nextIndex >= gameState.cards.length) {
      return false;
    }

    set({
      gameState: {
        ...gameState,
        currentCardIndex: nextIndex,
      },
      currentCard: gameState.cards[nextIndex],
    });

    return true;
  },

  finishGame: () => {
    const { gameState } = get();
    
    if (gameState.status !== 'playing' && gameState.status !== 'paused') {
      return null;
    }

    const reportId = `report-${Date.now()}`;
    
    set({
      gameState: {
        ...gameState,
        status: 'finished',
        endTime: Date.now(),
        currentReportId: reportId,
      },
    });

    return reportId;
  },

  resetGame: () => {
    set({
      gameState: initialState,
      currentCard: null,
    });
  },

  tickTimer: () => {
    const { gameState } = get();
    
    if (gameState.status !== 'playing') {
      return gameState.remainingTime;
    }

    const newTime = gameState.remainingTime - 1;
    
    if (newTime <= 0) {
      set({
        gameState: {
          ...gameState,
          remainingTime: 0,
          status: 'finished',
          endTime: Date.now(),
          currentReportId: `report-${Date.now()}`,
        },
      });
      return 0;
    }

    set({
      gameState: {
        ...gameState,
        remainingTime: newTime,
      },
    });

    return newTime;
  },

  setCurrentReportId: (id: string | null) => {
    const { gameState } = get();
    set({
      gameState: {
        ...gameState,
        currentReportId: id,
      },
    });
  },
}));
