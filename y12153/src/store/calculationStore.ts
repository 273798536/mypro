import { create } from 'zustand';
import type { CalculateRequest, CalculateResult, HistoryListItem, HistoryDetail, DataSource } from '@shared/types';
import { calculateRollComfort, getHistoryList, getHistoryDetail, deleteHistoryRecord } from '@/utils/api';

interface CalculationState {
  isCalculating: boolean;
  currentResult: CalculateResult | null;
  calculationError: string | null;
  historyList: HistoryListItem[];
  historyLoading: boolean;
  selectedHistory: HistoryDetail | null;
  lastRequest: CalculateRequest | null;

  calculate: (request: CalculateRequest) => Promise<void>;
  loadHistory: (limit?: number) => Promise<void>;
  loadHistoryDetail: (id: string) => Promise<void>;
  deleteHistory: (id: string) => Promise<void>;
  clearResult: () => void;
  clearSelectedHistory: () => void;
}

export const defaultDataSource: DataSource = {
  name: '手动输入',
  timestamp: new Date().toISOString(),
};

export const defaultCalculateRequest: CalculateRequest = {
  shipName: '',
  hullParams: {
    displacement: 5000,
    GM: 0.8,
    rollRadius: 4.5,
    shipLength: 120,
    shipWidth: 20,
    source: { ...defaultDataSource },
  },
  waveParams: {
    significantHeight: 1.5,
    wavePeriod: 8,
    waveDirection: 90,
    source: { ...defaultDataSource, name: '海洋站观测数据' },
  },
  navigationParams: {
    speed: 15,
    speedHistory: [14.5, 14.8, 15.2, 14.9, 15.1],
    headingAngle: 0,
    source: { ...defaultDataSource, name: '船舶AIS数据' },
  },
  cabinParams: {
    longitudinalPos: 0,
    verticalPos: 9,
    deck: 3,
    source: { ...defaultDataSource, name: '舱室布局图' },
  },
};

export const useCalculationStore = create<CalculationState>((set, get) => ({
  isCalculating: false,
  currentResult: null,
  calculationError: null,
  historyList: [],
  historyLoading: false,
  selectedHistory: null,
  lastRequest: null,

  calculate: async (request: CalculateRequest) => {
    set({ isCalculating: true, calculationError: null, lastRequest: request });
    try {
      const result = await calculateRollComfort(request);
      set({ currentResult: result, isCalculating: false });
      await get().loadHistory(10);
    } catch (error) {
      set({
        calculationError: error instanceof Error ? error.message : '计算失败',
        isCalculating: false,
      });
    }
  },

  loadHistory: async (limit?: number) => {
    set({ historyLoading: true });
    try {
      const history = await getHistoryList(limit);
      set({ historyList: history, historyLoading: false });
    } catch (error) {
      console.error('Load history error:', error);
      set({ historyLoading: false });
    }
  },

  loadHistoryDetail: async (id: string) => {
    try {
      const detail = await getHistoryDetail(id);
      set({ selectedHistory: detail });
    } catch (error) {
      console.error('Load history detail error:', error);
    }
  },

  deleteHistory: async (id: string) => {
    try {
      await deleteHistoryRecord(id);
      const state = get();
      if (state.selectedHistory?.id === id) {
        set({ selectedHistory: null });
      }
      await state.loadHistory(10);
    } catch (error) {
      console.error('Delete history error:', error);
    }
  },

  clearResult: () => {
    set({ currentResult: null, calculationError: null });
  },

  clearSelectedHistory: () => {
    set({ selectedHistory: null });
  },
}));
