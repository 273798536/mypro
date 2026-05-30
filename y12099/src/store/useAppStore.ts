import { create } from 'zustand';
import type {
  Roof,
  PanelProcessed,
  Obstacle,
  Filters,
  CameraView,
  DiagnosticResult,
  Season,
  DetailRecord,
} from '../data/types';

interface AppState {
  roof: Roof | null;
  panels: PanelProcessed[];
  obstacles: Obstacle[];
  obstaclesLoading: boolean;
  filters: Filters;
  selectedPanelId: string | null;
  selectedDetailId: string | null;
  currentHour: number;
  currentSeason: Season;
  isPlaying: boolean;
  playbackSpeed: number;
  savedViews: CameraView[];
  diagnosticResult: DiagnosticResult | null;
  isAnalyzing: boolean;
  hoveredPanelId: string | null;
  setRoof: (roof: Roof) => void;
  setPanels: (panels: PanelProcessed[]) => void;
  setObstacles: (obstacles: Obstacle[]) => void;
  setObstaclesLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setSelectedPanelId: (id: string | null) => void;
  setSelectedDetailId: (id: string | null) => void;
  setCurrentHour: (hour: number | ((prev: number) => number)) => void;
  setCurrentSeason: (season: Season) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  saveView: (name: string, position: [number, number, number], target: [number, number, number]) => void;
  deleteView: (id: string) => void;
  setDiagnosticResult: (result: DiagnosticResult | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setHoveredPanelId: (id: string | null) => void;
  resetFilters: () => void;
  focusPanel: (panelId: string) => void;
  getDetailRecords: () => DetailRecord[];
  getFilteredPanels: () => PanelProcessed[];
}

const defaultFilters: Filters = {
  severity: 'all',
  cause: 'all',
  season: 'all',
  panelId: 'all',
};

export const useAppStore = create<AppState>((set, get) => ({
  roof: null,
  panels: [],
  obstacles: [],
  obstaclesLoading: false,
  filters: defaultFilters,
  selectedPanelId: null,
  selectedDetailId: null,
  currentHour: 12,
  currentSeason: 'summer',
  isPlaying: false,
  playbackSpeed: 1,
  savedViews: [],
  diagnosticResult: null,
  isAnalyzing: false,
  hoveredPanelId: null,

  setRoof: (roof) => set({ roof }),
  setPanels: (panels) => set({ panels }),
  setObstacles: (obstacles) => set({ obstacles }),
  setObstaclesLoading: (loading) => set({ obstaclesLoading: loading }),
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      selectedDetailId: null,
    })),
  setSelectedPanelId: (id) => set({ selectedPanelId: id }),
  setSelectedDetailId: (id) => set({ selectedDetailId: id }),
  setCurrentHour: (hour) => {
    if (typeof hour === 'function') {
      set((state) => ({ currentHour: hour(state.currentHour) }));
    } else {
      set({ currentHour: hour });
    }
  },
  setCurrentSeason: (season) => set({ currentSeason: season }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  saveView: (name, position, target) => {
    const newView: CameraView = {
      id: `view-${Date.now()}`,
      name,
      position,
      target,
      createdAt: Date.now(),
    };
    set((state) => ({
      savedViews: [...state.savedViews, newView],
    }));
  },

  deleteView: (id) =>
    set((state) => ({
      savedViews: state.savedViews.filter((v) => v.id !== id),
    })),

  setDiagnosticResult: (result) => set({ diagnosticResult: result }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  setHoveredPanelId: (id) => set({ hoveredPanelId: id }),

  resetFilters: () => set({ filters: defaultFilters, selectedPanelId: null, selectedDetailId: null }),

  focusPanel: (panelId) => {
    set({
      selectedPanelId: panelId,
      filters: {
        ...get().filters,
        panelId,
      },
    });
  },

  getDetailRecords: (): DetailRecord[] => {
    const result = get().diagnosticResult;
    if (!result) return [];

    const records: DetailRecord[] = [];

    result.shadowRecords
      .filter((r) => r.severity !== 'none')
      .forEach((r) => {
        records.push({
          id: `shadow-${r.id}`,
          type: 'shadow',
          panelId: r.panelId,
          title: `组件遮挡 - ${r.hour}:00`,
          description: `遮挡率 ${(r.shadowRatio * 100).toFixed(1)}%，原因：${r.cause === 'obstacle' ? '障碍物' : r.cause === 'self' ? '自遮挡' : '方位角偏差'}`,
          severity: r.severity,
          suggestion: getShadowSuggestion(r.cause, r.severity),
          energyLossKwh: r.shadowRatio * 0.4,
          season: r.season,
          hour: r.hour,
        });
      });

    result.azimuthErrors.forEach((e) => {
      records.push({
        id: `azimuth-${e.id}`,
        type: 'azimuth',
        panelId: e.panelId,
        title: `方位角偏差`,
        description: `期望 ${e.expectedAzimuth.toFixed(1)}°，实际 ${e.actualAzimuth.toFixed(1)}°，偏差 ${e.deviation.toFixed(1)}°`,
        severity: e.deviation > 10 ? 'high' : e.deviation > 5 ? 'medium' : 'low',
        suggestion: e.suggestion,
        energyLossKwh: e.energyLossKwh,
      });
    });

    result.seasonMisses.forEach((m) => {
      records.push({
        id: `season-${m.id}`,
        type: 'season',
        panelId: m.panelId,
        title: `季节切换漏算`,
        description: `${getSeasonName(m.missedSeason)}发电未正确估算`,
        severity: 'medium',
        suggestion: m.suggestion,
        energyLossKwh: m.energyLossKwh,
        season: m.missedSeason,
      });
    });

    return records.sort((a, b) => b.energyLossKwh - a.energyLossKwh);
  },

  getFilteredPanels: (): PanelProcessed[] => {
    const { panels, filters, diagnosticResult } = get();
    if (!diagnosticResult) return panels;

    return panels.filter((panel) => {
      if (filters.panelId !== 'all' && panel.id !== filters.panelId) return false;

      if (filters.severity !== 'all' || filters.cause !== 'all' || filters.season !== 'all') {
        const hasMatchingShadow = diagnosticResult.shadowRecords.some(
          (r) =>
            r.panelId === panel.id &&
            (filters.severity === 'all' || r.severity === filters.severity) &&
            (filters.cause === 'all' || r.cause === filters.cause) &&
            (filters.season === 'all' || r.season === filters.season)
        );
        const hasMatchingAzimuth =
          filters.cause === 'all' || filters.cause === 'azimuth'
            ? diagnosticResult.azimuthErrors.some(
                (e) =>
                  e.panelId === panel.id &&
                  (filters.severity === 'all' ||
                    (filters.severity === 'high' && e.deviation > 10) ||
                    (filters.severity === 'medium' && e.deviation > 5 && e.deviation <= 10) ||
                    (filters.severity === 'low' && e.deviation <= 5))
              )
            : false;
        const hasMatchingSeason =
          filters.season === 'all'
            ? diagnosticResult.seasonMisses.some((m) => m.panelId === panel.id)
            : diagnosticResult.seasonMisses.some(
                (m) => m.panelId === panel.id && m.missedSeason === filters.season
              );

        if (filters.season !== 'all' && filters.severity === 'all' && filters.cause === 'all') {
          return hasMatchingShadow || hasMatchingSeason;
        }

        return hasMatchingShadow || hasMatchingAzimuth || hasMatchingSeason;
      }

      return true;
    });
  },
}));

function getShadowSuggestion(cause: string, severity: string): string {
  if (cause === 'obstacle') {
    if (severity === 'critical' || severity === 'high') {
      return '建议移动该组件至无遮挡区域，或移除/迁移障碍物。预计发电量提升15-25%。';
    }
    return '评估障碍物迁移成本，或接受该时段发电量损失。建议检查冬季阴影影响。';
  }
  if (cause === 'self') {
    return '调整组件行距，当前间距过小导致早晚自遮挡。建议增加间距0.3-0.5m。';
  }
  return '检查组件安装角度，与屋顶基准方位角对齐。';
}

function getSeasonName(season: Season): string {
  const names: Record<Season, string> = {
    spring: '春季',
    summer: '夏季',
    autumn: '秋季',
    winter: '冬季',
  };
  return names[season];
}
