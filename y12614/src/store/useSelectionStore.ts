import { create } from 'zustand';
import type { Selection, DetectionResult, Point } from '@/types';

interface SelectionStore {
  selections: Selection[];
  currentSelectionId: string | null;
  detectionResults: DetectionResult[];
  addSelection: (sampleId: string, points: Point[], color: string) => void;
  updateSelection: (id: string, updates: Partial<Selection>) => void;
  removeSelection: (id: string) => void;
  setCurrentSelectionId: (id: string | null) => void;
  addDetectionResult: (result: DetectionResult) => void;
  clearDetections: () => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selections: [],
  currentSelectionId: null,
  detectionResults: [],
  addSelection: (sampleId, points, color) => {
    const newSelection: Selection = {
      id: `selection-${Date.now()}`,
      sampleId,
      points,
      color,
      isOutOfBounds: false,
      isColliding: false,
      detectionResult: 'pass'
    };
    set((state) => ({
      selections: [...state.selections, newSelection],
      currentSelectionId: newSelection.id
    }));
  },
  updateSelection: (id, updates) => set((state) => ({
    selections: state.selections.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    )
  })),
  removeSelection: (id) => set((state) => ({
    selections: state.selections.filter((s) => s.id !== id),
    currentSelectionId: state.currentSelectionId === id ? null : state.currentSelectionId
  })),
  setCurrentSelectionId: (id) => set({ currentSelectionId: id }),
  addDetectionResult: (result) => set((state) => ({
    detectionResults: [...state.detectionResults, result]
  })),
  clearDetections: () => set({ detectionResults: [] }),
  clearSelections: () => set({ selections: [], currentSelectionId: null, detectionResults: [] })
}));
