import { create } from 'zustand';
import type { FilterState } from '../types/constraints';
import type { SceneSettings, AxisMapping } from '../types/portfolio';

interface FilterStoreState extends FilterState {
  sceneSettings: SceneSettings;
  isGeneratingFrontier: boolean;
  frontierPoints: number;
  
  setReturnRange: (min?: number, max?: number) => void;
  setVolatilityRange: (min?: number, max?: number) => void;
  setDrawdownRange: (min?: number, max?: number) => void;
  setSharpeMin: (min?: number) => void;
  toggleCategory: (category: string) => void;
  setShowAnomalies: (show: boolean) => void;
  setShowOnlyFeasible: (show: boolean) => void;
  
  setAxisMapping: (axis: 'x' | 'y' | 'z', mapping: AxisMapping) => void;
  setShowSurface: (show: boolean) => void;
  setShowPoints: (show: boolean) => void;
  setShowAxis: (show: boolean) => void;
  setHighlightOptimal: (highlight: boolean) => void;
  
  setFrontierPoints: (count: number) => void;
  setGeneratingFrontier: (generating: boolean) => void;
  
  resetFilters: () => void;
  resetSceneSettings: () => void;
}

const defaultSceneSettings: SceneSettings = {
  xAxis: 'volatility',
  yAxis: 'return',
  zAxis: 'drawdown',
  showSurface: true,
  showPoints: true,
  showAxis: true,
  highlightOptimal: true
};

const defaultFilterState: FilterState = {
  selectedCategories: [],
  showAnomalies: true,
  showOnlyFeasible: false
};

export const useFilterStore = create<FilterStoreState>((set) => ({
  ...defaultFilterState,
  sceneSettings: defaultSceneSettings,
  isGeneratingFrontier: false,
  frontierPoints: 50,

  setReturnRange: (min, max) => set({ returnMin: min, returnMax: max }),
  setVolatilityRange: (min, max) => set({ volatilityMin: min, volatilityMax: max }),
  setDrawdownRange: (min, max) => set({ drawdownMin: min, drawdownMax: max }),
  setSharpeMin: (min) => set({ sharpeMin: min }),
  
  toggleCategory: (category) => set((state) => ({
    selectedCategories: state.selectedCategories.includes(category)
      ? state.selectedCategories.filter(c => c !== category)
      : [...state.selectedCategories, category]
  })),
  
  setShowAnomalies: (show) => set({ showAnomalies: show }),
  setShowOnlyFeasible: (show) => set({ showOnlyFeasible: show }),

  setAxisMapping: (axis, mapping) => set((state) => ({
    sceneSettings: {
      ...state.sceneSettings,
      [`${axis}Axis`]: mapping
    }
  })),
  
  setShowSurface: (show) => set((state) => ({
    sceneSettings: { ...state.sceneSettings, showSurface: show }
  })),
  
  setShowPoints: (show) => set((state) => ({
    sceneSettings: { ...state.sceneSettings, showPoints: show }
  })),
  
  setShowAxis: (show) => set((state) => ({
    sceneSettings: { ...state.sceneSettings, showAxis: show }
  })),
  
  setHighlightOptimal: (highlight) => set((state) => ({
    sceneSettings: { ...state.sceneSettings, highlightOptimal: highlight }
  })),

  setFrontierPoints: (count) => set({ frontierPoints: count }),
  setGeneratingFrontier: (generating) => set({ isGeneratingFrontier: generating }),

  resetFilters: () => set(defaultFilterState),
  
  resetSceneSettings: () => set({ sceneSettings: defaultSceneSettings })
}));
