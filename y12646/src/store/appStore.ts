import { create } from 'zustand';
import type { Batch, Layer, Trajectory, Anomaly, Acupoint, Device, ExampleItem } from '@/types';
import {
  currentBatch,
  acupoints as initialAcupoints,
  examples as initialExamples,
  accuracyTrend as initialTrend,
  acupointHeatmap as initialHeatmap,
} from '@/data/mockData';

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedAcupointId: string | null;
  selectedTrajectoryId: string | null;
  isDrawing: boolean;
  showGrid: boolean;
  showBoundaries: boolean;
}

interface AppStore {
  batch: Batch;
  acupoints: Acupoint[];
  examples: ExampleItem[];
  accuracyTrend: { date: string; score: number }[];
  acupointHeatmap: { acupoint: string; attempts: number; accuracy: number }[];
  canvas: CanvasState;
  activeTab: string;

  setActiveTab: (tab: string) => void;

  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (x: number, y: number) => void;
  setSelectedAcupoint: (id: string | null) => void;
  setSelectedTrajectory: (id: string | null) => void;
  setIsDrawing: (drawing: boolean) => void;
  toggleGrid: () => void;
  toggleBoundaries: () => void;

  toggleLayerVisible: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;

  resolveAnomaly: (anomalyId: string, resolved: boolean) => void;
  addReviewNote: (anomalyId: string, note: string) => void;

  updateBatchStatus: (status: Batch['status']) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  batch: currentBatch,
  acupoints: initialAcupoints,
  examples: initialExamples,
  accuracyTrend: initialTrend,
  acupointHeatmap: initialHeatmap,

  canvas: {
    zoom: 1,
    panX: 0,
    panY: 0,
    selectedAcupointId: null,
    selectedTrajectoryId: null,
    isDrawing: false,
    showGrid: true,
    showBoundaries: true,
  },

  activeTab: 'canvas',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setCanvasZoom: (zoom) =>
    set((state) => ({ canvas: { ...state.canvas, zoom: Math.max(0.5, Math.min(2.5, zoom)) } })),

  setCanvasPan: (x, y) =>
    set((state) => ({ canvas: { ...state.canvas, panX: x, panY: y } })),

  setSelectedAcupoint: (id) =>
    set((state) => ({ canvas: { ...state.canvas, selectedAcupointId: id } })),

  setSelectedTrajectory: (id) =>
    set((state) => ({ canvas: { ...state.canvas, selectedTrajectoryId: id } })),

  setIsDrawing: (drawing) =>
    set((state) => ({ canvas: { ...state.canvas, isDrawing: drawing } })),

  toggleGrid: () =>
    set((state) => ({ canvas: { ...state.canvas, showGrid: !state.canvas.showGrid } })),

  toggleBoundaries: () =>
    set((state) => ({ canvas: { ...state.canvas, showBoundaries: !state.canvas.showBoundaries } })),

  toggleLayerVisible: (layerId) =>
    set((state) => ({
      batch: {
        ...state.batch,
        layers: state.batch.layers.map((l) =>
          l.id === layerId ? { ...l, visible: !l.visible } : l
        ),
        updatedAt: Date.now(),
      },
    })),

  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      batch: {
        ...state.batch,
        layers: state.batch.layers.map((l) =>
          l.id === layerId ? { ...l, opacity } : l
        ),
        updatedAt: Date.now(),
      },
    })),

  resolveAnomaly: (anomalyId, resolved) =>
    set((state) => ({
      batch: {
        ...state.batch,
        anomalies: state.batch.anomalies.map((a) =>
          a.id === anomalyId ? { ...a, resolved } : a
        ),
        updatedAt: Date.now(),
      },
    })),

  addReviewNote: (anomalyId, note) =>
    set((state) => ({
      batch: {
        ...state.batch,
        anomalies: state.batch.anomalies.map((a) =>
          a.id === anomalyId ? { ...a, notes: note } : a
        ),
        updatedAt: Date.now(),
      },
    })),

  updateBatchStatus: (status) =>
    set((state) => ({
      batch: { ...state.batch, status, updatedAt: Date.now() },
    })),
}));
