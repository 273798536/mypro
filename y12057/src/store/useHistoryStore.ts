import { create } from 'zustand';
import type { GameHistory } from '../engine/types';
import { loadAllGameHistories, deleteGameHistory } from '../utils/storage';
import { isDuplicateGameHistory } from '../utils/deduplication';

interface HistoryStore {
  histories: GameHistory[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterGrade: string;
  sortBy: 'date' | 'score' | 'grade';

  loadHistories: () => Promise<void>;
  deleteHistory: (historyId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterGrade: (grade: string) => void;
  setSortBy: (sortBy: 'date' | 'score' | 'grade') => void;
  checkDuplicate: (history: GameHistory) => boolean;
  getFilteredHistories: () => GameHistory[];
}

const gradeOrder: Record<string, number> = {
  'S': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1
};

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  histories: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filterGrade: 'all',
  sortBy: 'date',

  loadHistories: async () => {
    set({ isLoading: true, error: null });

    try {
      const histories = await loadAllGameHistories();
      set({ histories, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载失败',
        isLoading: false
      });
    }
  },

  deleteHistory: async (historyId: string) => {
    try {
      await deleteGameHistory(historyId);
      set(state => ({
        histories: state.histories.filter(h => h.id !== historyId)
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除失败'
      });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setFilterGrade: (grade: string) => {
    set({ filterGrade: grade });
  },

  setSortBy: (sortBy: 'date' | 'score' | 'grade') => {
    set({ sortBy });
  },

  checkDuplicate: (history: GameHistory) => {
    return isDuplicateGameHistory(history, get().histories);
  },

  getFilteredHistories: () => {
    const { histories, searchQuery, filterGrade, sortBy } = get();
    
    let filtered = [...histories];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.mapName.toLowerCase().includes(query) ||
        h.grade.toLowerCase().includes(query)
      );
    }

    if (filterGrade !== 'all') {
      filtered = filtered.filter(h => h.grade === filterGrade);
    }

    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'score':
        filtered.sort((a, b) => b.finalScore - a.finalScore);
        break;
      case 'grade':
        filtered.sort((a, b) => (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0));
        break;
    }

    return filtered;
  }
}));
