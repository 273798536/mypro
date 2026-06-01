import { create } from 'zustand';
import type {
  DataPoint,
  FilterState,
  DataQualityReport,
  AppState,
  OverlapRegion,
  ScreenshotRef,
} from '../types';

interface StarmapStore extends AppState {
  setDataPoints: (points: DataPoint[], datasetName: string) => void;
  setSelectedPointIds: (ids: string[]) => void;
  toggleLabel: (label: string) => void;
  setConfidenceRange: (range: [number, number]) => void;
  toggleGroup: (group: string) => void;
  setShowOverlapOnly: (show: boolean) => void;
  setShowOccluded: (show: boolean) => void;
  setShowOverlapHulls: (show: boolean) => void;
  setQualityReport: (report: DataQualityReport) => void;
  setOverlapRegions: (regions: OverlapRegion[]) => void;
  updateConfidence: (pointIds: string[], confidence: number, updatedBy: string) => void;
  addScreenshot: (screenshot: ScreenshotRef) => void;
  resetFilters: () => void;
  getFilteredPoints: () => DataPoint[];
  getSelectedPoints: () => DataPoint[];
  getLabels: () => string[];
  getGroups: () => string[];
}

const initialFilters: FilterState = {
  selectedLabels: [],
  confidenceRange: [0, 1],
  selectedGroups: [],
  showOverlapOnly: false,
  showOccluded: true,
};

export const useStarmapStore = create<StarmapStore>((set, get) => ({
  dataPoints: [],
  selectedPointIds: [],
  filters: initialFilters,
  qualityReport: null,
  showOverlapHulls: true,
  datasetName: '',
  overlapRegions: [],

  setDataPoints: (points, datasetName) => {
    const allLabels = [...new Set(points.map(p => p.trueLabel))];
    const allGroups = [...new Set(points.map(p => p.group))];
    set({
      dataPoints: points,
      datasetName,
      selectedPointIds: [],
      filters: {
        ...initialFilters,
        selectedLabels: allLabels,
        selectedGroups: allGroups,
      },
    });
  },

  setSelectedPointIds: (ids) => set({ selectedPointIds: ids }),

  toggleLabel: (label) => {
    const { selectedLabels } = get().filters;
    const newLabels = selectedLabels.includes(label)
      ? selectedLabels.filter(l => l !== label)
      : [...selectedLabels, label];
    set({ filters: { ...get().filters, selectedLabels: newLabels } });
  },

  setConfidenceRange: (range) => {
    set({ filters: { ...get().filters, confidenceRange: range } });
  },

  toggleGroup: (group) => {
    const { selectedGroups } = get().filters;
    const newGroups = selectedGroups.includes(group)
      ? selectedGroups.filter(g => g !== group)
      : [...selectedGroups, group];
    set({ filters: { ...get().filters, selectedGroups: newGroups } });
  },

  setShowOverlapOnly: (show) => {
    set({ filters: { ...get().filters, showOverlapOnly: show } });
  },

  setShowOccluded: (show) => {
    set({ filters: { ...get().filters, showOccluded: show } });
  },

  setShowOverlapHulls: (show) => set({ showOverlapHulls: show }),

  setQualityReport: (report) => set({ qualityReport: report }),

  setOverlapRegions: (regions) => set({ overlapRegions: regions }),

  updateConfidence: (pointIds, confidence, updatedBy) => {
    const now = new Date().toISOString();
    const updatedPoints = get().dataPoints.map(p => {
      if (pointIds.includes(p.id)) {
        return {
          ...p,
          confidence,
          confidenceUpdatedAt: now,
          confidenceUpdatedBy: updatedBy,
        };
      }
      return p;
    });
    set({ dataPoints: updatedPoints });
  },

  addScreenshot: (screenshot) => {
    const updatedPoints = get().dataPoints.map(p => {
      if (screenshot.dataPoints.includes(p.id)) {
        return {
          ...p,
          screenshots: [...p.screenshots, screenshot],
        };
      }
      return p;
    });
    set({ dataPoints: updatedPoints });
  },

  resetFilters: () => {
    const allLabels = get().getLabels();
    const allGroups = get().getGroups();
    set({
      filters: {
        ...initialFilters,
        selectedLabels: allLabels,
        selectedGroups: allGroups,
      },
    });
  },

  getFilteredPoints: () => {
    const { dataPoints, filters, overlapRegions } = get();
    const { selectedLabels, confidenceRange, selectedGroups, showOverlapOnly, showOccluded } = filters;

    const overlapPointIds = new Set(
      overlapRegions.flatMap(r => 
        dataPoints.filter(p => {
          const dist = Math.sqrt(
            Math.pow(p.embedding[0] - r.center[0], 2) +
            Math.pow(p.embedding[1] - r.center[1], 2) +
            Math.pow(p.embedding[2] - r.center[2], 2)
          );
          return dist < r.size;
        }).map(p => p.id)
      )
    );

    return dataPoints.filter(p => {
      if (!selectedLabels.includes(p.trueLabel)) return false;
      if (p.confidence < confidenceRange[0] || p.confidence > confidenceRange[1]) return false;
      if (!selectedGroups.includes(p.group)) return false;
      if (showOverlapOnly && !overlapPointIds.has(p.id)) return false;
      if (!showOccluded && p.isOccluded) return false;
      return true;
    });
  },

  getSelectedPoints: () => {
    const { dataPoints, selectedPointIds } = get();
    return dataPoints.filter(p => selectedPointIds.includes(p.id));
  },

  getLabels: () => {
    return [...new Set(get().dataPoints.map(p => p.trueLabel))];
  },

  getGroups: () => {
    return [...new Set(get().dataPoints.map(p => p.group))];
  },
}));
