import { create } from 'zustand';
import type { AppState, AppActions, Region, MonthlyMetrics, AnomalyStatus, AnalysisSession } from '@/types';
import { generateMockData } from '@/data/mockData';
import { detectAllAnomalies } from '@/utils/anomalyDetector';
import { loadSessionsFromStorage, loadStateFromStorage, saveSessionsToStorage, saveStateToStorage, computeSessionHash, isDuplicateSession } from '@/utils/storage';

const { regions: mockRegions, monthlyData: mockMonthlyData } = generateMockData();
const persistedState = loadStateFromStorage();
const persistedSessions = loadSessionsFromStorage();

const initialAnomalies = detectAllAnomalies(mockRegions, mockMonthlyData, {
  startYear: 2024,
  startMonth: 1,
  endYear: 2024,
  endMonth: 12,
});

const useAppStore = create<AppState & AppActions>((set, get) => ({
  regions: mockRegions,
  monthlyData: mockMonthlyData,
  currentTime: persistedState.currentTime || { year: 2024, month: 12 },
  selectedRegionId: null,
  hoveredRegionId: null,
  anomalies: initialAnomalies,
  sessions: persistedSessions,
  currentSessionId: null,
  isPlaying: false,
  playSpeed: persistedState.playSpeed || 1,
  parameters: persistedState.parameters || {
    lossRatioThresholds: [0.3, 0.5, 0.7, 0.9],
    heightScale: 1,
  },
  filters: persistedState.filters || {
    regions: [],
  },

  setCurrentTime: (time) => set({ currentTime: time }),

  selectRegion: (regionId) => set({ selectedRegionId: regionId }),

  hoverRegion: (regionId) => set({ hoveredRegionId: regionId }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setPlaySpeed: (speed) => {
    set({ playSpeed: speed });
    saveStateToStorage(get());
  },

  updateParameters: (params) => {
    set((state) => ({
      parameters: { ...state.parameters, ...params },
    }));
    saveStateToStorage(get());
  },

  updateFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    saveStateToStorage(get());
  },

  updateAnomalyStatus: (anomalyId, status, judgment) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId ? { ...a, status, judgment: judgment || a.judgment } : a
      ),
    }));
  },

  importRegionData: (region, metrics) => {
    set((state) => {
      const newRegions = [...state.regions.filter((r) => r.id !== region.id), region];
      const newMonthlyData = { ...state.monthlyData, [region.id]: metrics };
      const newAnomalies = detectAllAnomalies(newRegions, newMonthlyData, {
        startYear: 2024,
        startMonth: 1,
        endYear: 2024,
        endMonth: 12,
      });

      return {
        regions: newRegions,
        monthlyData: newMonthlyData,
        anomalies: newAnomalies,
      };
    });
  },

  updateRegionIncrementally: (regionId, updates) => {
    set((state) => {
      const newRegions = state.regions.map((r) =>
        r.id === regionId
          ? {
              ...r,
              ...updates,
              dataSource: {
                ...r.dataSource,
                ...(updates.dataSource || {}),
              },
            }
          : r
      );

      const region = newRegions.find((r) => r.id === regionId);
      const hasAllData =
        region?.dataSource.lossRatio &&
        region?.dataSource.premium &&
        region?.dataSource.hazardExposure;

      if (region && hasAllData && region.status === 'partial') {
        region.status = 'complete';
      }

      const newAnomalies = detectAllAnomalies(newRegions, state.monthlyData, {
        startYear: 2024,
        startMonth: 1,
        endYear: 2024,
        endMonth: 12,
      });

      return {
        regions: newRegions,
        anomalies: newAnomalies,
      };
    });
  },

  updateMetricsIncrementally: (regionId, updates, month, year) => {
    set((state) => {
      const regionMetrics = state.monthlyData[regionId] || [];
      const existingIndex = regionMetrics.findIndex((m) => m.month === month && m.year === year);

      let newMetrics: MonthlyMetrics[];
      if (existingIndex >= 0) {
        newMetrics = regionMetrics.map((m, i) =>
          i === existingIndex ? { ...m, ...updates } : m
        );
      } else {
        newMetrics = [...regionMetrics, { regionId, year, month, ...updates }];
      }

      const newMonthlyData = { ...state.monthlyData, [regionId]: newMetrics };
      const newAnomalies = detectAllAnomalies(state.regions, newMonthlyData, {
        startYear: 2024,
        startMonth: 1,
        endYear: 2024,
        endMonth: 12,
      });

      return {
        monthlyData: newMonthlyData,
        anomalies: newAnomalies,
      };
    });
  },

  saveSession: (name) => {
    const state = get();
    const sessionData: Omit<AnalysisSession, 'id' | 'timestamp' | 'hash'> = {
      name,
      viewState: {
        camera: { position: [0, 10, 15], target: [0, 0, 0] },
        timePosition: state.currentTime,
        filters: state.filters,
      },
      parameters: {
        ...state.parameters,
        colorMapping: {
          low: '#1e40af',
          mediumLow: '#0d9488',
          medium: '#eab308',
          mediumHigh: '#f97316',
          high: '#dc2626',
        },
      },
      anomalies: state.anomalies.reduce(
        (acc, a) => ({ ...acc, [a.id]: a.status }),
        {} as Record<string, AnomalyStatus>
      ),
    };

    const hash = computeSessionHash(sessionData as AnalysisSession);
    if (isDuplicateSession(hash, state.sessions)) {
      return null;
    }

    const newSession: AnalysisSession = {
      ...sessionData,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      hash,
    };

    const newSessions = [...state.sessions, newSession];
    set({ sessions: newSessions });
    saveSessionsToStorage(newSessions);
    return newSession.id;
  },

  loadSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    set((state) => ({
      currentTime: session.viewState.timePosition,
      filters: session.viewState.filters,
      parameters: {
        lossRatioThresholds: session.parameters.lossRatioThresholds,
        heightScale: session.parameters.heightScale,
      },
      anomalies: state.anomalies.map((a) =>
        session.anomalies[a.id] ? { ...a, status: session.anomalies[a.id] } : a
      ),
      currentSessionId: sessionId,
    }));
  },

  deleteSession: (sessionId) => {
    const newSessions = get().sessions.filter((s) => s.id !== sessionId);
    set({ sessions: newSessions });
    saveSessionsToStorage(newSessions);
  },

  getCurrentMetrics: (regionId) => {
    const state = get();
    const metrics = state.monthlyData[regionId] || [];
    return metrics.find(
      (m) => m.year === state.currentTime.year && m.month === state.currentTime.month
    );
  },

  getRegionAnomalies: (regionId) => {
    return get().anomalies.filter((a) => a.regionId === regionId);
  },
}));

export default useAppStore;
