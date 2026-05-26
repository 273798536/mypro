import { create } from 'zustand';
import type { Shelf, RobotTrajectory, Aisle, OrderHeat, Alert, HoverInfo } from '../types';
import { validateAllShelves, detectTrajectoryCollisions } from '../utils/dataValidator';

interface DataState {
  shelves: Shelf[];
  trajectories: RobotTrajectory[];
  aisles: Aisle[];
  orderHeats: OrderHeat[];
  alerts: Alert[];
  hoverInfo: HoverInfo | null;
  selectedShelfId: string | null;
  isLoading: boolean;
  error: string | null;

  setShelves: (shelves: Shelf[]) => void;
  setTrajectories: (trajectories: RobotTrajectory[]) => void;
  setAisles: (aisles: Aisle[]) => void;
  setOrderHeats: (orderHeats: OrderHeat[]) => void;
  addAlert: (alert: Alert) => void;
  resolveAlert: (alertId: string) => void;
  setHoverInfo: (info: HoverInfo | null) => void;
  setSelectedShelfId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  validateAllData: () => void;
  clearAll: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  shelves: [],
  trajectories: [],
  aisles: [],
  orderHeats: [],
  alerts: [],
  hoverInfo: null,
  selectedShelfId: null,
  isLoading: false,
  error: null,

  setShelves: (shelves) => set({ shelves }),
  setTrajectories: (trajectories) => set({ trajectories }),
  setAisles: (aisles) => set({ aisles }),
  setOrderHeats: (orderHeats) => set({ orderHeats }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, alert],
    })),

  resolveAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, resolved: true } : a
      ),
    })),

  setHoverInfo: (info) => set({ hoverInfo: info }),
  setSelectedShelfId: (id) => set({ selectedShelfId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  validateAllData: () => {
    const { shelves, trajectories } = get();
    const shelfAlerts = validateAllShelves(shelves);
    const collisionAlerts = detectTrajectoryCollisions(trajectories, shelves);
    set((state) => ({
      alerts: [...state.alerts, ...shelfAlerts, ...collisionAlerts],
    }));
  },

  clearAll: () =>
    set({
      shelves: [],
      trajectories: [],
      aisles: [],
      orderHeats: [],
      alerts: [],
      hoverInfo: null,
      selectedShelfId: null,
    }),
}));
