import { create } from 'zustand';
import { Scenario, DetectionResult, UIState, DetectionState } from '../types';
import { mockScenario, mockScenarioWithRoute } from '../data/mockScenario';
import { runDetection } from '../engine/DetectionEngine';

interface AppState {
  scenario: Scenario;
  detection: DetectionState;
  ui: UIState;
  loadScenario: (withRoute?: boolean) => void;
  addPersonnelRoute: () => void;
  runFirstDetection: () => void;
  runSecondDetection: () => Promise<void>;
  resetDetection: () => void;
  setShowLabels: (show: boolean) => void;
  setShowSectionPlane: (show: boolean) => void;
  setSectionPlanePosition: (position: [number, number, number]) => void;
  setSelectedDetectionId: (id: string | null) => void;
  setCompareMode: (enabled: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  scenario: mockScenario,
  detection: {
    isDetecting: false,
    firstPassResults: [],
    secondPassResults: [],
    hasPersonnelRoute: false,
    detectionCount: 0,
  },
  ui: {
    showLabels: true,
    showSectionPlane: false,
    sectionPlanePosition: [30, 0, 0],
    sectionPlaneNormal: [1, 0, 0],
    selectedDetectionId: null,
    compareMode: false,
  },

  loadScenario: (withRoute = false) => {
    set({
      scenario: withRoute ? mockScenarioWithRoute : mockScenario,
      detection: {
        isDetecting: false,
        firstPassResults: [],
        secondPassResults: [],
        hasPersonnelRoute: withRoute,
        detectionCount: 0,
      },
    });
  },

  addPersonnelRoute: () => {
    set({
      scenario: mockScenarioWithRoute,
      detection: {
        ...get().detection,
        hasPersonnelRoute: true,
      },
    });
  },

  runFirstDetection: () => {
    const { scenario } = get();
    const results = runDetection(scenario);
    set({
      detection: {
        ...get().detection,
        firstPassResults: results,
        detectionCount: get().detection.detectionCount + 1,
      },
    });
  },

  runSecondDetection: async () => {
    set({ detection: { ...get().detection, isDetecting: true } });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const { scenario } = get();
    const results = runDetection(scenario);
    
    set({
      detection: {
        ...get().detection,
        isDetecting: false,
        secondPassResults: results,
        detectionCount: get().detection.detectionCount + 1,
      },
    });
  },

  resetDetection: () => {
    set({
      scenario: mockScenario,
      detection: {
        isDetecting: false,
        firstPassResults: [],
        secondPassResults: [],
        hasPersonnelRoute: false,
        detectionCount: 0,
      },
      ui: {
        ...get().ui,
        selectedDetectionId: null,
        compareMode: false,
      },
    });
  },

  setShowLabels: (show: boolean) => {
    set({ ui: { ...get().ui, showLabels: show } });
  },

  setShowSectionPlane: (show: boolean) => {
    set({ ui: { ...get().ui, showSectionPlane: show } });
  },

  setSectionPlanePosition: (position: [number, number, number]) => {
    set({ ui: { ...get().ui, sectionPlanePosition: position } });
  },

  setSelectedDetectionId: (id: string | null) => {
    set({ ui: { ...get().ui, selectedDetectionId: id } });
  },

  setCompareMode: (enabled: boolean) => {
    set({ ui: { ...get().ui, compareMode: enabled } });
  },
}));

export const useCurrentResults = (): DetectionResult[] => {
  const { detection } = useStore();
  return detection.secondPassResults.length > 0
    ? detection.secondPassResults
    : detection.firstPassResults;
};
