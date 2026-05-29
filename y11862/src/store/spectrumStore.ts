import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AudioAnalysisResult,
  VisualParams,
  ViewportConfig,
  DEFAULT_VISUAL_PARAMS,
  PeakMarker,
} from '../types';

interface SpectrumState {
  analysisResult: AudioAnalysisResult | null;
  visualParams: VisualParams;
  viewports: ViewportConfig[];
  isAnalyzing: boolean;
  analysisProgress: number;
  selectedPeak: PeakMarker | null;
  hoveredPeak: PeakMarker | null;

  setAnalysisResult: (result: AudioAnalysisResult | null) => void;
  setVisualParams: (params: Partial<VisualParams>) => void;
  resetVisualParams: () => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAnalysisProgress: (progress: number) => void;
  saveViewport: (name: string, camera: ViewportConfig['camera']) => void;
  deleteViewport: (id: string) => void;
  loadViewport: (id: string) => ViewportConfig['camera'] | null;
  setSelectedPeak: (peak: PeakMarker | null) => void;
  setHoveredPeak: (peak: PeakMarker | null) => void;
  clearAll: () => void;
}

export const useSpectrumStore = create<SpectrumState>()(
  persist(
    (set, get) => ({
      analysisResult: null,
      visualParams: DEFAULT_VISUAL_PARAMS,
      viewports: [],
      isAnalyzing: false,
      analysisProgress: 0,
      selectedPeak: null,
      hoveredPeak: null,

      setAnalysisResult: (result) => set({ analysisResult: result }),

      setVisualParams: (params) =>
        set((state) => ({
          visualParams: { ...state.visualParams, ...params },
        })),

      resetVisualParams: () => set({ visualParams: DEFAULT_VISUAL_PARAMS }),

      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing, analysisProgress: isAnalyzing ? 0 : 1 }),

      setAnalysisProgress: (progress) => set({ analysisProgress: progress }),

      saveViewport: (name, camera) => {
        const newViewport: ViewportConfig = {
          id: Date.now().toString(),
          name,
          camera,
          createdAt: Date.now(),
        };
        set((state) => ({
          viewports: [...state.viewports, newViewport],
        }));
      },

      deleteViewport: (id) =>
        set((state) => ({
          viewports: state.viewports.filter((v) => v.id !== id),
        })),

      loadViewport: (id) => {
        const viewport = get().viewports.find((v) => v.id === id);
        return viewport ? viewport.camera : null;
      },

      setSelectedPeak: (peak) => set({ selectedPeak: peak }),

      setHoveredPeak: (peak) => set({ hoveredPeak: peak }),

      clearAll: () =>
        set({
          analysisResult: null,
          selectedPeak: null,
          hoveredPeak: null,
          analysisProgress: 0,
          isAnalyzing: false,
        }),
    }),
    {
      name: 'spectrum-viewport-storage',
      partialize: (state) => ({
        viewports: state.viewports,
        visualParams: state.visualParams,
      }),
    }
  )
);
