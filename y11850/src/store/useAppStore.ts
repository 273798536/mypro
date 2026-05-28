import { create } from 'zustand';
import { AppStore, Season, ShadowAnalysis, ReviewItem, SavedView, DataPackage, ValidationResult } from '@/types';
import { getMockDataPackage } from '@/data/mockData';
import { validateDataPackage } from '@/utils/dataValidator';
import { analyzeAllApartments } from '@/utils/shadowDetector';
import { parseTimezone } from '@/utils/sunCalculator';

const initialState: Omit<AppStore, keyof { [K in keyof AppStore as AppStore[K] extends Function ? K : never]: AppStore[K] }> = {
  currentSeason: 'winter',
  currentTime: 12,
  selectedBuildingId: null,
  selectedFloor: null,
  dataPackage: null,
  validationResult: null,
  analysisResults: [],
  reviewMarks: [],
  savedViews: [],
  isPlaying: false,
  showSunPath: true,
  showShadows: true,
  showSetbackLines: true,
};

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  setSeason: (season: Season) => {
    set({ currentSeason: season });
    const { dataPackage, currentSeason: newSeason } = get();
    if (dataPackage) {
      const tzOffset = parseTimezone(dataPackage.timezone) || 8;
      const sunPathData = {
        spring: dataPackage.sunPath.spring,
        summer: dataPackage.sunPath.summer,
        autumn: dataPackage.sunPath.autumn,
        winter: dataPackage.sunPath.winter,
      };
      const results = analyzeAllApartments(dataPackage.buildings, sunPathData, newSeason);
      set({ analysisResults: results });
    }
  },

  setTime: (time: number | ((prev: number) => number)) => set((state) => ({ 
    currentTime: typeof time === 'function' ? time(state.currentTime) : time 
  })),

  setSelectedBuilding: (id: string | null) => set({ 
    selectedBuildingId: id,
    selectedFloor: null,
  }),

  setSelectedFloor: (floor: number | null) => set({ selectedFloor: floor }),

  setDataPackage: (pkg: DataPackage | null) => {
    set({ dataPackage: pkg });
    if (pkg) {
      get().validateData();
      get().runAnalysis();
    }
  },

  setValidationResult: (result: ValidationResult | null) => set({ validationResult: result }),

  setAnalysisResults: (results: ShadowAnalysis[]) => set({ analysisResults: results }),

  addReviewMark: (mark: ReviewItem) => set((state) => ({
    reviewMarks: [...state.reviewMarks, mark],
  })),

  updateReviewMark: (id: string, updates: Partial<ReviewItem>) => set((state) => ({
    reviewMarks: state.reviewMarks.map(mark =>
      mark.id === id ? { ...mark, ...updates } : mark
    ),
  })),

  saveView: (view: Omit<SavedView, 'id' | 'createdAt'>) => set((state) => ({
    savedViews: [
      ...state.savedViews,
      {
        ...view,
        id: `view-${Date.now()}`,
        createdAt: Date.now(),
      },
    ],
  })),

  deleteView: (id: string) => set((state) => ({
    savedViews: state.savedViews.filter(v => v.id !== id),
  })),

  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),

  toggleSunPath: () => set((state) => ({ showSunPath: !state.showSunPath })),

  toggleShadows: () => set((state) => ({ showShadows: !state.showShadows })),

  toggleSetbackLines: () => set((state) => ({ showSetbackLines: !state.showSetbackLines })),

  validateData: () => {
    const { dataPackage } = get();
    if (!dataPackage) return;
    
    const result = validateDataPackage(dataPackage);
    set({ 
      validationResult: result,
      reviewMarks: result.needsReview,
    });
  },

  runAnalysis: () => {
    const { dataPackage, currentSeason } = get();
    if (!dataPackage) return;
    
    const sunPathData = {
      spring: dataPackage.sunPath.spring,
      summer: dataPackage.sunPath.summer,
      autumn: dataPackage.sunPath.autumn,
      winter: dataPackage.sunPath.winter,
    };
    
    const results = analyzeAllApartments(dataPackage.buildings, sunPathData, currentSeason);
    set({ analysisResults: results });
  },

  loadMockData: () => {
    const pkg = getMockDataPackage('correct');
    get().setDataPackage(pkg);
  },
}));

export function useCurrentBuilding() {
  const { dataPackage, selectedBuildingId } = useAppStore();
  return dataPackage?.buildings.find(b => b.id === selectedBuildingId) || null;
}

export function useBuildingAnalysis(buildingId: string) {
  const { analysisResults } = useAppStore();
  return analysisResults.filter(r => r.buildingId === buildingId);
}

export function useApartmentAnalysis(apartmentId: string) {
  const { analysisResults } = useAppStore();
  return analysisResults.find(r => r.apartmentId === apartmentId) || null;
}
