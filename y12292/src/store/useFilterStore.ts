
import { create } from 'zustand';
import type { FilterState } from '../types';

interface FilterStore extends FilterState {
  setTimeRange: (range: { start: number; end: number }) => void;
  setSelectedFloors: (floors: string[]) => void;
  toggleFloor: (floorId: string) => void;
  setSignalStrength: (range: { min: number; max: number }) => void;
  setShowHeatmap: (show: boolean) => void;
  setShowTrajectory: (show: boolean) => void;
  setShowBeacons: (show: boolean) => void;
  setShowProblems: (show: boolean) => void;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  timeRange: { start: Date.now() - 3600000, end: Date.now() },
  selectedFloors: ['floor-1', 'floor-2', 'floor-3'],
  signalStrength: { min: -80, max: -40 },
  showHeatmap: true,
  showTrajectory: true,
  showBeacons: true,
  showProblems: true,
  
  setTimeRange: (timeRange) => set({ timeRange }),
  
  setSelectedFloors: (selectedFloors) => set({ selectedFloors }),
  
  toggleFloor: (floorId) => set((state) => {
    const selectedFloors = state.selectedFloors.includes(floorId)
      ? state.selectedFloors.filter(id => id !== floorId)
      : [...state.selectedFloors, floorId];
    return { selectedFloors };
  }),
  
  setSignalStrength: (signalStrength) => set({ signalStrength }),
  
  setShowHeatmap: (showHeatmap) => set({ showHeatmap }),
  setShowTrajectory: (showTrajectory) => set({ showTrajectory }),
  setShowBeacons: (showBeacons) => set({ showBeacons }),
  setShowProblems: (showProblems) => set({ showProblems }),
}));

