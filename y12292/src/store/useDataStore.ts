
import { create } from 'zustand';
import type { DataState, FloorData, BeaconData, TrajectoryPoint, DeviceLog, Problem, HeatmapCell, FileRecord } from '../types';
import { mockFloors, mockBeacons, mockTrajectories, mockLogs, mockProblems, mockHeatmap } from '../mock/data';

interface DataStore extends DataState {
  setFloors: (floors: FloorData[]) => void;
  setBeacons: (beacons: BeaconData[]) => void;
  setTrajectories: (trajectories: TrajectoryPoint[]) => void;
  setLogs: (logs: DeviceLog[]) => void;
  setProblems: (problems: Problem[]) => void;
  setHeatmapData: (heatmap: HeatmapCell[]) => void;
  addRawFile: (category: 'floorModels' | 'trajectoryFiles' | 'logFiles', file: FileRecord) => void;
  setLoading: (loading: boolean) => void;
  loadMockData: () => void;
}

export const useDataStore = create<DataStore>((set) => ({
  floors: [],
  beacons: [],
  trajectories: [],
  logs: [],
  problems: [],
  heatmapData: [],
  rawFiles: {
    floorModels: [],
    trajectoryFiles: [],
    logFiles: []
  },
  isLoading: false,
  
  setFloors: (floors) => set({ floors }),
  setBeacons: (beacons) => set({ beacons }),
  setTrajectories: (trajectories) => set({ trajectories }),
  setLogs: (logs) => set({ logs }),
  setProblems: (problems) => set({ problems }),
  setHeatmapData: (heatmapData) => set({ heatmapData }),
  
  addRawFile: (category, file) => set((state) => ({
    rawFiles: {
      ...state.rawFiles,
      [category]: [...state.rawFiles[category], file]
    }
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  loadMockData: () => set({
    floors: mockFloors,
    beacons: mockBeacons,
    trajectories: mockTrajectories,
    logs: mockLogs,
    problems: mockProblems,
    heatmapData: mockHeatmap
  })
}));

