import { create } from 'zustand';
import type { Hotspot, MapConfig, DetectionResult, ReviewScore, GameStatus, SampleData } from '@/types';
import { runAllDetections } from '@/utils/detector';

interface CanvasState {
  status: GameStatus;
  currentSample: SampleData | null;
  hotspots: Hotspot[];
  mapConfig: MapConfig | null;
  detections: DetectionResult[];
  scores: ReviewScore[];
  history: {
    hotspots: Hotspot[];
    detections: DetectionResult[];
  }[];
  historyIndex: number;

  setStatus: (status: GameStatus) => void;
  loadSample: (sample: SampleData) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  updateHotspot: (id: string, updates: Partial<Hotspot>) => void;
  runDetection: () => void;
  calculateScores: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  settle: () => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  status: 'idle',
  currentSample: null,
  hotspots: [],
  mapConfig: null,
  detections: [],
  scores: [],
  history: [],
  historyIndex: -1,

  setStatus: (status) => set({ status }),

  loadSample: (sample) => {
    const initialHotspots = JSON.parse(JSON.stringify(sample.hotspots));
    const initialMapConfig = JSON.parse(JSON.stringify(sample.mapConfig));
    const initialDetections = runAllDetections(initialHotspots, initialMapConfig);

    set({
      currentSample: sample,
      hotspots: initialHotspots,
      mapConfig: initialMapConfig,
      detections: initialDetections,
      scores: [],
      history: [{
        hotspots: initialHotspots,
        detections: initialDetections
      }],
      historyIndex: 0,
      status: 'running'
    });
  },

  start: () => {
    const { currentSample } = get();
    if (!currentSample) return;

    const initialHotspots = JSON.parse(JSON.stringify(currentSample.hotspots));
    const initialMapConfig = JSON.parse(JSON.stringify(currentSample.mapConfig));
    const initialDetections = runAllDetections(initialHotspots, initialMapConfig);

    set({
      hotspots: initialHotspots,
      mapConfig: initialMapConfig,
      detections: initialDetections,
      scores: [],
      history: [{
        hotspots: initialHotspots,
        detections: initialDetections
      }],
      historyIndex: 0,
      status: 'running'
    });
  },

  pause: () => {
    const { status } = get();
    if (status === 'running') {
      set({ status: 'paused' });
    }
  },

  resume: () => {
    const { status } = get();
    if (status === 'paused') {
      set({ status: 'running' });
    }
  },

  updateHotspot: (id, updates) => {
    const { hotspots, history, historyIndex, mapConfig, status } = get();
    if (status !== 'running' || !mapConfig) return;

    const newHotspots = hotspots.map(h =>
      h.id === id ? { ...h, ...updates } : h
    );
    const newDetections = runAllDetections(newHotspots, mapConfig);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      hotspots: JSON.parse(JSON.stringify(newHotspots)),
      detections: JSON.parse(JSON.stringify(newDetections))
    });

    set({
      hotspots: newHotspots,
      detections: newDetections,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  runDetection: () => {
    const { hotspots, mapConfig } = get();
    if (!mapConfig) return;

    const detections = runAllDetections(hotspots, mapConfig);
    set({ detections });
  },

  calculateScores: () => {
    const { detections, hotspots } = get();

    const calcCategoryScore = (errorTypes: string[], hasAnyFail: boolean): { score: number; status: 'pass' | 'review' | 'fail'; details: string[] } => {
      const categoryDetections = detections.filter(d => errorTypes.includes(d.type));
      const errorCount = categoryDetections.filter(d => d.severity === 'error').length;
      const warningCount = categoryDetections.filter(d => d.severity === 'warning').length;
      const details = categoryDetections.map(d => d.message);

      let score: number;
      let status: 'pass' | 'review' | 'fail';

      if (errorCount > 0 || (hasAnyFail && categoryDetections.length > 0)) {
        score = Math.max(0, 100 - errorCount * 40 - warningCount * 15);
        status = 'fail';
      } else if (warningCount > 0) {
        score = Math.max(0, 100 - warningCount * 20);
        status = 'review';
      } else {
        score = 100;
        status = 'pass';
      }

      return { score, status, details };
    };

    const coordComplete = calcCategoryScore(['empty'], false);
    const unique = calcCategoryScore(['duplicate'], true);
    const coordValid = calcCategoryScore(['flipped'], true);
    const scale = calcCategoryScore(['scale_error'], false);
    const norm = calcCategoryScore(['mixed_notes'], false);

    const scores: ReviewScore[] = [
      {
        category: '坐标完整性',
        score: coordComplete.score,
        maxScore: 100,
        status: coordComplete.status,
        details: coordComplete.details
      },
      {
        category: '数据唯一性',
        score: unique.score,
        maxScore: 100,
        status: unique.status,
        details: unique.details
      },
      {
        category: '坐标有效性',
        score: coordValid.score,
        maxScore: 100,
        status: coordValid.status,
        details: coordValid.details
      },
      {
        category: '比例尺标注',
        score: scale.score,
        maxScore: 100,
        status: scale.status,
        details: scale.details
      },
      {
        category: '数据规范性',
        score: norm.score,
        maxScore: 100,
        status: norm.status,
        details: norm.details
      }
    ];

    set({ scores });
  },

  undo: () => {
    const { historyIndex, history, status } = get();
    if (status !== 'running') return;
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];
      set({
        hotspots: JSON.parse(JSON.stringify(snapshot.hotspots)),
        detections: JSON.parse(JSON.stringify(snapshot.detections)),
        historyIndex: newIndex
      });
    }
  },

  redo: () => {
    const { historyIndex, history, status } = get();
    if (status !== 'running') return;
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];
      set({
        hotspots: JSON.parse(JSON.stringify(snapshot.hotspots)),
        detections: JSON.parse(JSON.stringify(snapshot.detections)),
        historyIndex: newIndex
      });
    }
  },

  reset: () => {
    const { currentSample } = get();
    if (!currentSample) return;

    const initialHotspots = JSON.parse(JSON.stringify(currentSample.hotspots));
    const initialMapConfig = JSON.parse(JSON.stringify(currentSample.mapConfig));
    const initialDetections = runAllDetections(initialHotspots, initialMapConfig);

    set({
      hotspots: initialHotspots,
      mapConfig: initialMapConfig,
      detections: initialDetections,
      scores: [],
      history: [{
        hotspots: initialHotspots,
        detections: initialDetections
      }],
      historyIndex: 0,
      status: 'running'
    });
  },

  settle: () => {
    const { status } = get();
    if (status !== 'running' && status !== 'paused') return;
    get().calculateScores();
    set({ status: 'settled' });
  }
}));