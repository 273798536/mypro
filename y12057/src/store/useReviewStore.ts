import { create } from 'zustand';
import type { GameState, GameSnapshot, DataSource } from '../engine/types';
import { loadGameState, loadSnapshots, loadDataSource } from '../utils/storage';

interface ReviewStore {
  gameState: GameState | null;
  snapshots: GameSnapshot[];
  currentSnapshotIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedEventId: string | null;
  selectedDecisionId: string | null;
  dataSourceCache: Map<string, DataSource>;
  isLoading: boolean;
  error: string | null;

  loadGame: (gameId: string) => Promise<void>;
  setSnapshotIndex: (index: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  selectEvent: (eventId: string | null) => void;
  selectDecision: (decisionId: string | null) => void;
  getDataSource: (id: string) => Promise<DataSource | undefined>;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  gameState: null,
  snapshots: [],
  currentSnapshotIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  selectedEventId: null,
  selectedDecisionId: null,
  dataSourceCache: new Map(),
  isLoading: false,
  error: null,

  loadGame: async (gameId: string) => {
    set({ isLoading: true, error: null });

    try {
      const [gameState, snapshots] = await Promise.all([
        loadGameState(gameId),
        loadSnapshots(gameId)
      ]);

      if (!gameState) {
        throw new Error('未找到对局数据');
      }

      set({
        gameState,
        snapshots: snapshots.length > 0 ? snapshots : gameState.snapshots,
        currentSnapshotIndex: 0,
        isLoading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载失败',
        isLoading: false
      });
    }
  },

  setSnapshotIndex: (index: number) => {
    const { snapshots } = get();
    const clampedIndex = Math.max(0, Math.min(snapshots.length - 1, index));
    set({ currentSnapshotIndex: clampedIndex });
  },

  togglePlayback: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: speed });
  },

  selectEvent: (eventId: string | null) => {
    set({ selectedEventId: eventId, selectedDecisionId: null });
  },

  selectDecision: (decisionId: string | null) => {
    set({ selectedDecisionId: decisionId, selectedEventId: null });
  },

  getDataSource: async (id: string) => {
    const { dataSourceCache } = get();
    
    if (dataSourceCache.has(id)) {
      return dataSourceCache.get(id);
    }

    const dataSource = await loadDataSource(id);
    if (dataSource) {
      set(state => ({
        dataSourceCache: new Map(state.dataSourceCache).set(id, dataSource)
      }));
    }

    return dataSource;
  },

  reset: () => {
    set({
      gameState: null,
      snapshots: [],
      currentSnapshotIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      selectedEventId: null,
      selectedDecisionId: null,
      dataSourceCache: new Map(),
      error: null
    });
  }
}));
