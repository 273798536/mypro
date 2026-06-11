import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BoomPoint,
  RemarkHistory,
  ScreenshotHistory,
  MaterialTrace,
  PointStatus,
} from '../types';
import { generateMockData } from '../services/mockData';
import { generateId } from '../utils/date';

interface DataState {
  points: BoomPoint[];
  remarkHistory: RemarkHistory[];
  screenshotHistory: ScreenshotHistory[];
  materialTraces: MaterialTrace[];
  isInitialized: boolean;
}

interface DataActions {
  initializeMockData: () => void;
  updateRemark: (pointId: string, remark: string, operator: string) => void;
  updateStatus: (pointId: string, status: PointStatus) => void;
  addScreenshot: (pointId: string, dataUrl: string, description: string) => void;
  resolveMixedUnit: (pointId: string, targetUnit: string) => void;
  importPoints: (points: BoomPoint[]) => void;
  resetData: () => void;
}

export type DataStore = DataState & DataActions;

const initialState: DataState = {
  points: [],
  remarkHistory: [],
  screenshotHistory: [],
  materialTraces: [],
  isInitialized: false,
};

export const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initializeMockData: () => {
        if (get().isInitialized) return;
        const mockData = generateMockData();
        set({
          points: mockData.points,
          remarkHistory: mockData.remarkHistory,
          screenshotHistory: mockData.screenshotHistory,
          materialTraces: mockData.materialTraces,
          isInitialized: true,
        });
      },

      updateRemark: (pointId: string, remark: string, operator: string) => {
        const now = Date.now();
        const historyEntry: RemarkHistory = {
          id: generateId(),
          pointId,
          remark,
          timestamp: now,
          operator,
        };

        set(state => ({
          points: state.points.map(p =>
            p.id === pointId ? { ...p, currentRemark: remark } : p
          ),
          remarkHistory: [...state.remarkHistory, historyEntry],
        }));
      },

      updateStatus: (pointId: string, status: PointStatus) => {
        set(state => ({
          points: state.points.map(p =>
            p.id === pointId ? { ...p, status } : p
          ),
        }));
      },

      addScreenshot: (pointId: string, dataUrl: string, description: string) => {
        const screenshot: ScreenshotHistory = {
          id: generateId(),
          pointId,
          dataUrl,
          timestamp: Date.now(),
          description,
        };
        set(state => ({
          screenshotHistory: [...state.screenshotHistory, screenshot],
        }));
      },

      resolveMixedUnit: (pointId: string, targetUnit: string) => {
        set(state => ({
          points: state.points.map(p =>
            p.id === pointId ? { ...p, floorUnit: targetUnit } : p
          ),
        }));
      },

      importPoints: (newPoints: BoomPoint[]) => {
        set({
          points: newPoints,
          isInitialized: true,
        });
      },

      resetData: () => {
        const mockData = generateMockData();
        set({
          points: mockData.points,
          remarkHistory: mockData.remarkHistory,
          screenshotHistory: mockData.screenshotHistory,
          materialTraces: mockData.materialTraces,
          isInitialized: true,
        });
      },
    }),
    {
      name: 'theater-boom-timeline-data',
      version: 1,
    }
  )
);
