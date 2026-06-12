import { create } from 'zustand';
import type {
  DashboardData,
  Sample,
  Station,
  Anomaly,
  BuoyData,
  AquacultureLog,
  ReportData,
  AuditLogEntry,
} from '@/types';

interface AppState {
  dashboard: DashboardData | null;
  samples: Sample[];
  currentSample: Sample | null;
  stations: Station[];
  selectedStationId: string | null;
  anomalies: Anomaly[];
  buoyLateItems: BuoyData[];
  aquacultureLogs: AquacultureLog[];
  report: ReportData | null;
  auditLogs: AuditLogEntry[];
  loading: Record<string, boolean>;
  error: Record<string, string | null>;

  fetchDashboard: () => Promise<void>;
  fetchSamples: (filters?: Record<string, string>) => Promise<void>;
  fetchSample: (id: string) => Promise<void>;
  setCurrentSample: (sample: Sample | null) => void;
  fetchStations: () => Promise<void>;
  selectStation: (id: string | null) => void;
  fetchAnomalies: (filters?: Record<string, string>) => Promise<void>;
  resolveAnomaly: (id: string, resolution: string) => Promise<void>;
  fetchBuoyStatus: () => Promise<void>;
  simulateBuoyArrival: (sampleId: string) => Promise<void>;
  fetchLogs: (stationId?: string) => Promise<void>;
  addLog: (log: { stationId: string; species: string; activity: string; observation?: string; reportedBy: string; reportDate: string }) => Promise<void>;
  fetchReport: () => Promise<void>;
  fetchAuditLogs: (limit?: number) => Promise<void>;
}

const apiFetch = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data as T;
};

const setLoading = (
  loading: Record<string, boolean>,
  key: string,
  val: boolean,
) => ({ ...loading, [key]: val });

const setError = (
  error: Record<string, string | null>,
  key: string,
  val: string | null,
) => ({ ...error, [key]: val });

export const useAppStore = create<AppState>((set, get) => ({
  dashboard: null,
  samples: [],
  currentSample: null,
  stations: [],
  selectedStationId: null,
  anomalies: [],
  buoyLateItems: [],
  aquacultureLogs: [],
  report: null,
  auditLogs: [],
  loading: {},
  error: {},

  fetchDashboard: async () => {
    set((s) => ({ loading: setLoading(s.loading, 'dashboard', true), error: setError(s.error, 'dashboard', null) }));
    try {
      const data = await apiFetch<DashboardData>('/api/dashboard');
      set({ dashboard: data, loading: setLoading(get().loading, 'dashboard', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'dashboard', false), error: setError(get().error, 'dashboard', e.message) });
    }
  },

  fetchSamples: async (filters) => {
    set((s) => ({ loading: setLoading(s.loading, 'samples', true), error: setError(s.error, 'samples', null) }));
    try {
      const qs = filters ? '?' + new URLSearchParams(filters).toString() : '';
      const data = await apiFetch<Sample[]>(`/api/samples${qs}`);
      set({ samples: data, loading: setLoading(get().loading, 'samples', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'samples', false), error: setError(get().error, 'samples', e.message) });
    }
  },

  fetchSample: async (id) => {
    set((s) => ({ loading: setLoading(s.loading, 'sample', true), error: setError(s.error, 'sample', null) }));
    try {
      const data = await apiFetch<Sample>(`/api/samples/${id}`);
      set({ currentSample: data, loading: setLoading(get().loading, 'sample', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'sample', false), error: setError(get().error, 'sample', e.message) });
    }
  },

  setCurrentSample: (sample) => set({ currentSample: sample }),

  fetchStations: async () => {
    set((s) => ({ loading: setLoading(s.loading, 'stations', true), error: setError(s.error, 'stations', null) }));
    try {
      const data = await apiFetch<Station[]>('/api/stations');
      set({ stations: data, loading: setLoading(get().loading, 'stations', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'stations', false), error: setError(get().error, 'stations', e.message) });
    }
  },

  selectStation: (id) => set({ selectedStationId: id }),

  fetchAnomalies: async (filters) => {
    set((s) => ({ loading: setLoading(s.loading, 'anomalies', true), error: setError(s.error, 'anomalies', null) }));
    try {
      const qs = filters ? '?' + new URLSearchParams(filters).toString() : '';
      const data = await apiFetch<Anomaly[]>(`/api/anomalies${qs}`);
      set({ anomalies: data, loading: setLoading(get().loading, 'anomalies', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'anomalies', false), error: setError(get().error, 'anomalies', e.message) });
    }
  },

  resolveAnomaly: async (id, resolution) => {
    try {
      await apiFetch(`/api/anomalies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution }),
      });
      const updated = get().anomalies.map((a) =>
        a.id === id ? { ...a, status: 'resolved' as const, resolution } : a,
      );
      set({ anomalies: updated });
      if (get().currentSample) {
        set({
          currentSample: {
            ...get().currentSample!,
            anomalies: get().currentSample!.anomalies.map((a) =>
              a.id === id ? { ...a, status: 'resolved' as const, resolution } : a,
            ),
          },
        });
      }
    } catch (e: any) {
      set({ error: setError(get().error, 'resolveAnomaly', e.message) });
    }
  },

  fetchBuoyStatus: async () => {
    try {
      const data = await apiFetch<BuoyData[]>('/api/buoy/status');
      set({ buoyLateItems: data.filter((b) => b.isLate) });
    } catch (e: any) {
      set({ error: setError(get().error, 'buoyStatus', e.message) });
    }
  },

  simulateBuoyArrival: async (sampleId) => {
    try {
      await apiFetch('/api/buoy/arrive', {
        method: 'POST',
        body: JSON.stringify({ sampleId }),
      });
      await get().fetchBuoyStatus();
    } catch (e: any) {
      set({ error: setError(get().error, 'buoyArrival', e.message) });
    }
  },

  fetchLogs: async (stationId) => {
    const qs = stationId ? `?stationId=${stationId}` : '';
    try {
      const data = await apiFetch<AquacultureLog[]>(`/api/aquaculture-log${qs}`);
      set({ aquacultureLogs: data });
    } catch (e: any) {
      set({ error: setError(get().error, 'logs', e.message) });
    }
  },

  addLog: async (log) => {
    try {
      await apiFetch('/api/aquaculture-log', {
        method: 'POST',
        body: JSON.stringify(log),
      });
      await get().fetchLogs(log.stationId);
    } catch (e: any) {
      set({ error: setError(get().error, 'addLog', e.message) });
    }
  },

  fetchReport: async () => {
    set((s) => ({ loading: setLoading(s.loading, 'report', true), error: setError(s.error, 'report', null) }));
    try {
      const data = await apiFetch<ReportData>('/api/report');
      set({ report: data, loading: setLoading(get().loading, 'report', false) });
    } catch (e: any) {
      set({ loading: setLoading(get().loading, 'report', false), error: setError(get().error, 'report', e.message) });
    }
  },

  fetchAuditLogs: async (limit) => {
    const qs = limit ? `?limit=${limit}` : '';
    try {
      const data = await apiFetch<AuditLogEntry[]>(`/api/audit-log${qs}`);
      set({ auditLogs: data });
    } catch (e: any) {
      set({ error: setError(get().error, 'auditLogs', e.message) });
    }
  },
}));
