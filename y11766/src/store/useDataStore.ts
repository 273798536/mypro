import { create } from 'zustand';
import type { AppState, CorrectionTrace } from '../types';
import { mockHoldings, mockRedemptions, mockCashPositions, mockTradeCalendar, mockCorrectionTraces } from '../data/mockData';
import { detectAllRisks } from '../services/riskDetection';
import dayjs from 'dayjs';

const today = dayjs().format('YYYY-MM-DD');
const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

const initialRisks = detectAllRisks(mockRedemptions, mockHoldings, mockCashPositions, mockTradeCalendar);

export const useDataStore = create<AppState>((set, get) => ({
  currentDate: today,
  dateRange: [startDate, today],
  holdings: mockHoldings,
  redemptions: mockRedemptions,
  cashPositions: mockCashPositions,
  riskAlerts: initialRisks,
  correctionTraces: mockCorrectionTraces,
  tradeCalendar: mockTradeCalendar,
  selectedBlockId: null,
  selectedRiskType: null,
  sidebarTab: 'holdings',
  isPlaying: false,

  setCurrentDate: (date: string) => {
    set({ currentDate: date });
    get().recalculateRisks();
  },

  setDateRange: (range: [string, string]) => set({ dateRange: range }),

  selectBlock: (id: string | null) => set({ selectedBlockId: id }),

  setSidebarTab: (tab: AppState['sidebarTab']) => set({ sidebarTab: tab }),

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  applyCorrection: (trace: Omit<CorrectionTrace, 'id' | 'correctedAt'>) => {
    const newTrace: CorrectionTrace = {
      ...trace,
      id: `corr_${Date.now()}`,
      correctedAt: dayjs().toISOString(),
    };

    set((state) => ({
      correctionTraces: [...state.correctionTraces, newTrace],
    }));

    if (trace.recordType === 'HOLDING') {
      set((state) => ({
        holdings: state.holdings.map((h) =>
          h.id === trace.recordId
            ? { ...h, [trace.fieldName]: trace.correctedValue, isCorrected: true }
            : h
        ),
      }));
    } else if (trace.recordType === 'REDEMPTION') {
      set((state) => ({
        redemptions: state.redemptions.map((r) =>
          r.id === trace.recordId
            ? { ...r, [trace.fieldName]: trace.correctedValue, isCorrected: true }
            : r
        ),
      }));
    } else if (trace.recordType === 'CASH_POSITION') {
      set((state) => ({
        cashPositions: state.cashPositions.map((c) =>
          c.id === trace.recordId
            ? { ...c, [trace.fieldName]: trace.correctedValue, isCorrected: true }
            : c
        ),
      }));
    }

    get().recalculateRisks();
  },

  recalculateRisks: () => {
    const { redemptions, holdings, cashPositions, tradeCalendar } = get();
    const newRisks = detectAllRisks(redemptions, holdings, cashPositions, tradeCalendar);
    set({ riskAlerts: newRisks });
  },

  resolveRisk: (riskId: string) => {
    set((state) => ({
      riskAlerts: state.riskAlerts.map((r) =>
        r.id === riskId ? { ...r, isResolved: true } : r
      ),
    }));
  },
}));
