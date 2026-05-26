import { create } from 'zustand';
import type { BookItem, GameAction, GameLevel, GameRecord, GameState } from '@/types';

interface GameStore extends GameState {
  gameRecords: GameRecord[];
  highScores: Record<number, number>;
  startGame: (level: GameLevel, items: BookItem[]) => void;
  processItem: (itemId: string, action: GameAction) => void;
  updateTime: (time: number) => void;
  completeGame: () => GameRecord;
  resetGame: () => void;
  setCurrentRecordId: (id: string | null) => void;
  addGameRecord: (record: GameRecord) => void;
  setHighScore: (levelId: number, score: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentLevel: null,
  items: [],
  processedItems: new Set(),
  score: 0,
  timeRemaining: 0,
  actions: [],
  status: 'idle',
  currentRecordId: null,
  gameRecords: [],
  highScores: {},

  startGame: (level, items) => {
    set({
      currentLevel: level,
      items,
      processedItems: new Set(),
      score: 0,
      timeRemaining: level.timeLimit,
      actions: [],
      status: 'playing',
      currentRecordId: null,
    });
  },

  processItem: (itemId, action) => {
    const state = get();
    const newProcessed = new Set(state.processedItems);
    newProcessed.add(itemId);

    set({
      processedItems: newProcessed,
      actions: [...state.actions, action],
      score: state.score + action.points,
    });
  },

  updateTime: (time) => {
    set({ timeRemaining: time });
  },

  completeGame: () => {
    const state = get();
    const now = new Date();
    const startTime = new Date(now.getTime() - (state.currentLevel!.timeLimit - state.timeRemaining) * 1000);

    const record: GameRecord = {
      id: `record-${Date.now()}`,
      levelId: state.currentLevel!.id,
      levelName: state.currentLevel!.name,
      score: state.score,
      totalItems: state.items.length,
      correctCount: state.actions.filter(a => a.isCorrect).length,
      errorCount: state.actions.filter(a => !a.isCorrect).length,
      actions: state.actions,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      duration: state.currentLevel!.timeLimit - state.timeRemaining,
    };

    const existingRecords = [...state.gameRecords, record];
    const newHighScores = { ...state.highScores };
    if (!newHighScores[record.levelId] || record.score > newHighScores[record.levelId]) {
      newHighScores[record.levelId] = record.score;
    }

    set({
      status: 'completed',
      currentRecordId: record.id,
      gameRecords: existingRecords,
      highScores: newHighScores,
    });

    try {
      localStorage.setItem('bookstoreGameRecords', JSON.stringify(existingRecords));
      localStorage.setItem('bookstoreGameHighScores', JSON.stringify(newHighScores));
    } catch {}

    return record;
  },

  resetGame: () => {
    set({
      currentLevel: null,
      items: [],
      processedItems: new Set(),
      score: 0,
      timeRemaining: 0,
      actions: [],
      status: 'idle',
      currentRecordId: null,
    });
  },

  setCurrentRecordId: (id) => {
    set({ currentRecordId: id });
  },

  addGameRecord: (record) => {
    const state = get();
    set({ gameRecords: [...state.gameRecords, record] });
  },

  setHighScore: (levelId, score) => {
    const state = get();
    set({
      highScores: {
        ...state.highScores,
        [levelId]: Math.max(state.highScores[levelId] || 0, score),
      },
    });
  },
}));
