import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BurnDataPoint } from '../types';

interface ViewState {
  timeSlice: number;
  selectedOwnerId: string | null;
  selectedDataPoint: BurnDataPoint | null;
  selectedExpenseId: string | null;
  selectedRevenueId: string | null;
  cameraPosition: [number, number, number];
  isPlaying: boolean;
  showLabels: boolean;
  showGrid: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  setTimeSlice: (slice: number | ((prev: number) => number)) => void;
  setSelectedOwner: (ownerId: string | null) => void;
  setSelectedDataPoint: (point: BurnDataPoint | null) => void;
  setSelectedExpenseId: (id: string | null) => void;
  setSelectedRevenueId: (id: string | null) => void;
  setCameraPosition: (pos: [number, number, number]) => void;
  togglePlay: () => void;
  toggleLabels: () => void;
  toggleGrid: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  resetView: () => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      timeSlice: 0.45,
      selectedOwnerId: null,
      selectedDataPoint: null,
      selectedExpenseId: null,
      selectedRevenueId: null,
      cameraPosition: [8, 8, 8],
      isPlaying: false,
      showLabels: true,
      showGrid: true,
      leftPanelOpen: true,
      rightPanelOpen: true,

      setTimeSlice: (slice) => set((state) => ({ 
        timeSlice: typeof slice === 'function' ? slice(state.timeSlice) : slice 
      })),
      setSelectedOwner: (ownerId) => set({ selectedOwnerId: ownerId }),
      setSelectedDataPoint: (point) => set({ selectedDataPoint: point }),
      setSelectedExpenseId: (id) => set({ selectedExpenseId: id }),
      setSelectedRevenueId: (id) => set({ selectedRevenueId: id }),
      setCameraPosition: (pos) => set({ cameraPosition: pos }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      resetView: () => set({
        timeSlice: 0.45,
        selectedOwnerId: null,
        selectedDataPoint: null,
        cameraPosition: [8, 8, 8],
        isPlaying: false
      })
    }),
    {
      name: 'view-storage',
      partialize: (state) => ({
        timeSlice: state.timeSlice,
        cameraPosition: state.cameraPosition,
        showLabels: state.showLabels,
        showGrid: state.showGrid
      })
    }
  )
);
