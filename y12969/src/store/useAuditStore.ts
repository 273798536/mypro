import { create } from 'zustand';
import type {
  AuditRound,
  BackupRecord,
  Anomaly,
  IndexSuggestion,
  StatusLog,
  CapacityTrendPoint,
} from '../../shared/types';
import { api } from '@/utils/api';

interface AuditState {
  rounds: AuditRound[];
  currentRoundId: string | null;
  records: BackupRecord[];
  anomalies: Anomaly[];
  suggestions: IndexSuggestion[];
  logs: StatusLog[];
  trend: CapacityTrendPoint[];
  loading: Record<string, boolean>;
  loadRounds: () => Promise<void>;
  setCurrentRound: (id: string) => Promise<void>;
  loadAllForRound: (roundId: string) => Promise<void>;
  refreshAnomalies: () => Promise<void>;
  refreshSuggestions: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  rounds: [],
  currentRoundId: null,
  records: [],
  anomalies: [],
  suggestions: [],
  logs: [],
  trend: [],
  loading: {},

  loadRounds: async () => {
    set({ loading: { ...get().loading, rounds: true } });
    try {
      const data = await api.getRounds();
      const active = data.find((r) => r.status === 'active') || data[0];
      set({
        rounds: data,
        currentRoundId: active ? active.id : null,
        loading: { ...get().loading, rounds: false },
      });
      if (active) {
        await get().loadAllForRound(active.id);
      }
    } catch (e) {
      set({ loading: { ...get().loading, rounds: false } });
      console.error(e);
    }
  },

  setCurrentRound: async (id: string) => {
    set({ currentRoundId: id });
    await get().loadAllForRound(id);
  },

  loadAllForRound: async (roundId: string) => {
    set({ loading: { ...get().loading, roundData: true } });
    try {
      const [records, anomalies, suggestions, logs, trend] = await Promise.all([
        api.getRecords(roundId),
        api.getAnomalies(roundId),
        api.getIndexSuggestions(roundId),
        api.getLogs(roundId),
        api.getTrend(roundId),
      ]);
      set({
        records,
        anomalies,
        suggestions,
        logs,
        trend,
        loading: { ...get().loading, roundData: false },
      });
    } catch (e) {
      set({ loading: { ...get().loading, roundData: false } });
      console.error(e);
    }
  },

  refreshAnomalies: async () => {
    const roundId = get().currentRoundId;
    if (!roundId) return;
    try {
      const [anomalies, records] = await Promise.all([
        api.getAnomalies(roundId),
        api.getRecords(roundId),
      ]);
      set({ anomalies, records });
    } catch (e) {
      console.error(e);
    }
  },

  refreshSuggestions: async () => {
    const roundId = get().currentRoundId;
    if (!roundId) return;
    try {
      const data = await api.getIndexSuggestions(roundId);
      set({ suggestions: data });
    } catch (e) {
      console.error(e);
    }
  },
}));
