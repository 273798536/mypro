import { create } from 'zustand';
import type { ProjectState, BuildingBlock, SoundSource, WindData, Complaint, TimelineEvent, HeatmapData, ReportData } from '../types';

interface ProjectStore extends ProjectState {
  setBuildings: (buildings: BuildingBlock[]) => void;
  setSoundSources: (sources: SoundSource[]) => void;
  setWindData: (data: WindData[]) => void;
  setComplaints: (complaints: Complaint[]) => void;
  setTimeline: (timeline: TimelineEvent[]) => void;
  setHeatmap: (heatmap: HeatmapData[]) => void;
  setCurrentTime: (time: number | ((prev: number) => number)) => void;
  setIsPlaying: (playing: boolean) => void;
  toggleSoundType: (type: string) => void;
  toggleBuildingType: (type: string) => void;
  setShowWind: (show: boolean) => void;
  setShowHeatmap: (show: boolean) => void;
  setViewMode: (mode: '3d' | 'heatmap' | 'timeline') => void;
  correctWindGap: (windId: string) => void;
  generateReport: () => ReportData;
  importData: (data: Partial<ProjectState>) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  buildings: [],
  soundSources: [],
  windData: [],
  complaints: [],
  timeline: [],
  heatmap: [],
  currentTime: 0,
  isPlaying: false,
  selectedFilters: {
    soundTypes: ['stage', 'traffic', 'wind', 'complaint', 'other'],
    buildingTypes: ['residential', 'commercial', 'stage', 'other'],
    showWind: true,
    showHeatmap: true,
  },
  viewMode: '3d',

  setBuildings: (buildings) => set({ buildings }),
  setSoundSources: (soundSources) => set({ soundSources }),
  setWindData: (windData) => set({ windData }),
  setComplaints: (complaints) => set({ complaints }),
  setTimeline: (timeline) => set({ timeline }),
  setHeatmap: (heatmap) => set({ heatmap }),
  setCurrentTime: (currentTime) => set((state) => ({
    currentTime: typeof currentTime === 'function' ? currentTime(state.currentTime) : currentTime,
  })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  toggleSoundType: (type) => set((state) => ({
    selectedFilters: {
      ...state.selectedFilters,
      soundTypes: state.selectedFilters.soundTypes.includes(type)
        ? state.selectedFilters.soundTypes.filter(t => t !== type)
        : [...state.selectedFilters.soundTypes, type],
    },
  })),

  toggleBuildingType: (type) => set((state) => ({
    selectedFilters: {
      ...state.selectedFilters,
      buildingTypes: state.selectedFilters.buildingTypes.includes(type)
        ? state.selectedFilters.buildingTypes.filter(t => t !== type)
        : [...state.selectedFilters.buildingTypes, type],
    },
  })),

  setShowWind: (showWind) => set((state) => ({
    selectedFilters: { ...state.selectedFilters, showWind },
  })),

  setShowHeatmap: (showHeatmap) => set((state) => ({
    selectedFilters: { ...state.selectedFilters, showHeatmap },
  })),

  setViewMode: (viewMode) => set({ viewMode }),

  correctWindGap: (windId) => set((state) => ({
    windData: state.windData.map(w =>
      w.id === windId ? { ...w, gap: false, notes: `${w.notes || ''} [已修正风向缺口]`.trim() } : w
    ),
  })),

  generateReport: () => {
    const state = get();
    const windGapCorrected = !state.windData.some(w => w.gap);
    const highSeverityComplaints = state.complaints.filter(c => c.severity === 'high').length;
    const soundOverlapCount = state.timeline.filter(t => t.type === 'sound_overlap').length;
    const windGapCount = state.windData.filter(w => w.gap).length;
    const averageDecibels = state.soundSources.length > 0
      ? state.soundSources.reduce((sum, s) => sum + s.decibels, 0) / state.soundSources.length
      : 0;

    return {
      generatedAt: new Date(),
      windGapCorrected,
      summary: {
        totalComplaints: state.complaints.length,
        highSeverityComplaints,
        soundOverlapCount,
        windGapCount,
        averageDecibels: Math.round(averageDecibels * 10) / 10,
      },
      timelineAnalysis: [...state.timeline].sort((a, b) => a.order - b.order),
      recommendations: [
        windGapCorrected ? '风向缺口已修正，风场数据完整' : '存在风向缺口，建议补充完整数据',
        highSeverityComplaints > 3 ? '高优先级投诉较多，建议重点处理声源重叠区域' : '投诉数量在可控范围内',
        soundOverlapCount > 5 ? '声源重叠现象频繁，建议调整舞台或降噪设施位置' : '声源重叠情况良好',
        averageDecibels > 75 ? '平均分贝较高，建议增加隔音措施' : '声环境整体达标',
      ],
    };
  },

  importData: (data) => set((state) => ({
    buildings: data.buildings?.map(b => ({
      ...b,
      position: b.position || { x: 0, y: 0, z: 0 },
      dimensions: b.dimensions || { width: 10, height: 20, depth: 10 },
      floors: b.floors || 5,
      type: b.type || 'other',
    })) || state.buildings,
    soundSources: data.soundSources?.map(s => ({
      ...s,
      position: s.position || { x: 0, y: 0, z: 0 },
      decibels: s.decibels || 60,
      frequency: s.frequency || 500,
      activeTime: s.activeTime || { start: 0, end: 24 },
      type: s.type || 'other',
    })) || state.soundSources,
    windData: data.windData?.map((w, i) => ({
      ...w,
      id: w.id || `wind-${i}`,
      timestamp: w.timestamp || i,
      direction: w.direction ?? 0,
      speed: w.speed ?? 0,
    })) || state.windData,
    complaints: data.complaints?.map((c, i) => ({
      ...c,
      id: c.id || `complaint-${i}`,
      timestamp: c.timestamp || 0,
      severity: c.severity || 'medium',
    })) || state.complaints,
    timeline: data.timeline || state.timeline,
    heatmap: data.heatmap || state.heatmap,
  })),
}));
