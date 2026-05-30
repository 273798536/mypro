import { create } from 'zustand';
import { AppState, AppActions } from '@/types';

const useAppStore = create<AppState & AppActions>((set) => ({
  currentTimeIndex: 0,
  isPlaying: false,
  playSpeed: 1,
  slopeThreshold: 35,
  rainfallThreshold: 100,
  showDuplicateCracks: true,
  showMissingRainfall: true,
  showCoordinateErrors: true,
  showDevices: true,
  showHouseholds: true,
  showCracks: true,
  selectedProfile: null,
  hoveredObject: null,

  setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaySpeed: (speed) => set({ playSpeed: speed }),
  setSlopeThreshold: (threshold) => set({ slopeThreshold: threshold }),
  setRainfallThreshold: (threshold) => set({ rainfallThreshold: threshold }),
  setShowDuplicateCracks: (show) => set({ showDuplicateCracks: show }),
  setShowMissingRainfall: (show) => set({ showMissingRainfall: show }),
  setShowCoordinateErrors: (show) => set({ showCoordinateErrors: show }),
  setShowDevices: (show) => set({ showDevices: show }),
  setShowHouseholds: (show) => set({ showHouseholds: show }),
  setShowCracks: (show) => set({ showCracks: show }),
  setSelectedProfile: (profile) => set({ selectedProfile: profile }),
  setHoveredObject: (id) => set({ hoveredObject: id }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));

export default useAppStore;
