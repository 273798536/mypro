import { create } from 'zustand';
import type {
  FuturesData,
  CorrectionRecord,
  DetectionResult,
  Filters,
} from '../types';
import { generateMockData } from '../data/mockData';
import { detectAllBackwardation } from '../utils/backwardation';
import { detectAllAnomalies } from '../utils/anomaly';

interface StoreState {
  data: FuturesData[];
  corrections: CorrectionRecord[];
  detections: DetectionResult[];
  selectedDataId: string | null;
  timeWindowIndex: number;
  isPlaying: boolean;
  playSpeed: number;
  filters: Filters;
  hoveredDataId: string | null;
  alertExpanded: boolean;

  setData: (data: FuturesData[]) => void;
  addCorrection: (correction: CorrectionRecord) => void;
  setDetections: (detections: DetectionResult[]) => void;
  resolveDetection: (id: string) => void;
  setSelectedDataId: (id: string | null) => void;
  setHoveredDataId: (id: string | null) => void;
  setTimeWindowIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaySpeed: (speed: number) => void;
  toggleFilter: (key: keyof Filters) => void;
  toggleAlertExpanded: () => void;
  loadMockData: () => void;
  importData: (rows: { data: FuturesData | null; originalRow: number; error: string | null }[]) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  data: [],
  corrections: [],
  detections: [],
  selectedDataId: null,
  timeWindowIndex: 0,
  isPlaying: false,
  playSpeed: 1,
  filters: {
    showBackwardation: true,
    showWarnings: true,
    volumeHeatmap: true,
  },
  hoveredDataId: null,
  alertExpanded: true,

  setData: (data) => {
    const backwardationDetections = detectAllBackwardation(data);
    const anomalyDetections = detectAllAnomalies(data);
    const allDetections = [...backwardationDetections, ...anomalyDetections];
    set({ data, detections: allDetections, timeWindowIndex: 0 });
  },

  addCorrection: (correction) => {
    set((state) => ({
      corrections: [...state.corrections, correction],
      data: state.data.map((d) =>
        d.id === correction.dataId
          ? { ...d, [correction.fieldName]: correction.newValue, status: 'corrected' }
          : d
      ),
    }));
  },

  setDetections: (detections) => set({ detections }),

  resolveDetection: (id) =>
    set((state) => ({
      detections: state.detections.map((d) =>
        d.id === id ? { ...d, resolved: true } : d
      ),
    })),

  setSelectedDataId: (id) => set({ selectedDataId: id }),
  setHoveredDataId: (id) => set({ hoveredDataId: id }),
  setTimeWindowIndex: (index) => set({ timeWindowIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),

  toggleFilter: (key) =>
    set((state) => ({
      filters: { ...state.filters, [key]: !state.filters[key] },
    })),

  toggleAlertExpanded: () =>
    set((state) => ({ alertExpanded: !state.alertExpanded })),

  loadMockData: () => {
    const mockData = generateMockData();
    get().setData(mockData);
  },

  importData: (rows) => {
    const validData = rows
      .filter((r) => r.data !== null)
      .map((r) => r.data as FuturesData);

    const parseErrors: DetectionResult[] = rows
      .filter((r) => r.error !== null)
      .map((r) => ({
        id: `det-parse-${r.originalRow}`,
        type: 'parse_error' as const,
        severity: 'error' as const,
        description: `第${r.originalRow}行: ${r.error}`,
        originalRow: r.originalRow,
        relatedDataIds: [],
        resolved: false,
      }));

    const backwardationDetections = detectAllBackwardation(validData);
    const anomalyDetections = detectAllAnomalies(validData);

    set({
      data: validData,
      detections: [...parseErrors, ...backwardationDetections, ...anomalyDetections],
      timeWindowIndex: 0,
      selectedDataId: null,
    });
  },
}));