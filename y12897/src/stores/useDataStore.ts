import { create } from 'zustand';
import type {
  RiskNotice,
  BuoyData,
  ShipTrack,
  AquacultureLog,
  SalinityData,
  OilSpillFrame,
  TidalWindow,
} from '@/types';
import {
  riskNotices,
  buoys,
  shipTracks,
  aquacultureLogs,
  salinityDataList,
  oilSpillFrames,
  tidalWindows,
} from '@/data/mockData';

interface DataState {
  riskNotices: RiskNotice[];
  buoys: BuoyData[];
  shipTracks: ShipTrack[];
  aquacultureLogs: AquacultureLog[];
  salinityDataList: SalinityData[];
  oilSpillFrames: OilSpillFrame[];
  tidalWindows: TidalWindow[];
  selectedRiskNoticeId: string | null;
  centerLat: number;
  centerLon: number;
  scale: number;
}

interface DataActions {
  setSelectedRiskNotice: (id: string | null) => void;
  addRiskNotice: (notice: RiskNotice) => void;
  updateBuoy: (buoy: BuoyData) => void;
  importData: (type: string, data: unknown[]) => void;
}

export const useDataStore = create<DataState & DataActions>((set) => ({
  riskNotices,
  buoys,
  shipTracks,
  aquacultureLogs,
  salinityDataList,
  oilSpillFrames,
  tidalWindows,
  selectedRiskNoticeId: null,
  centerLat: 22.58,
  centerLon: 113.92,
  scale: 1.2,

  setSelectedRiskNotice: (id) => set({ selectedRiskNoticeId: id }),

  addRiskNotice: (notice) =>
    set((state) => ({
      riskNotices: [...state.riskNotices, notice],
    })),

  updateBuoy: (buoy) =>
    set((state) => ({
      buoys: state.buoys.map((b) => (b.id === buoy.id ? buoy : b)),
    })),

  importData: (type, data) =>
    set((state) => {
      switch (type) {
        case 'riskNotice':
          return { riskNotices: [...state.riskNotices, ...(data as RiskNotice[])] };
        case 'buoy':
          return { buoys: [...state.buoys, ...(data as BuoyData[])] };
        case 'ship':
          return { shipTracks: [...state.shipTracks, ...(data as ShipTrack[])] };
        case 'aquaculture':
          return { aquacultureLogs: [...state.aquacultureLogs, ...(data as AquacultureLog[])] };
        case 'salinity':
          return { salinityDataList: [...state.salinityDataList, ...(data as SalinityData[])] };
        default:
          return state;
      }
    }),
}));
