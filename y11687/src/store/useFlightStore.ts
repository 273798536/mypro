import { create } from 'zustand';
import {
  FlightRoute,
  Waypoint,
  StormCloud,
  NoFlyZone,
  CollisionResult,
  FuelResult,
  AircraftSpec,
  HistoryRecord,
} from '../types';
import { airports } from '../data/airports';
import { storms } from '../data/storms';
import { noFlyZones } from '../data/noFlyZones';
import { defaultAircraft } from '../data/aircraft';
import { checkAllCollisions } from '../engine/collision';
import { calculateFuel } from '../engine/fuelCalculator';

const HISTORY_KEY = 'flight_planner_history';
const MAX_HISTORY = 50;

interface FlightState {
  currentRoute: FlightRoute | null;
  selectedWaypointId: string | null;
  isEditing: boolean;
  storms: StormCloud[];
  noFlyZones: NoFlyZone[];
  airports: Waypoint[];
  aircraftSpec: AircraftSpec;
  collisionResult: CollisionResult | null;
  fuelResult: FuelResult | null;
  history: HistoryRecord[];

  initRoute: () => void;
  addWaypoint: (waypoint: Waypoint, position?: number) => void;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (id: string, lat: number, lng: number) => void;
  selectWaypoint: (id: string | null) => void;
  setCruiseAlt: (alt: number) => void;
  setAircraftSpec: (spec: AircraftSpec) => void;
  setEditing: (editing: boolean) => void;
  updateRouteName: (name: string) => void;
  validateRoute: () => void;
  saveRoute: (description?: string) => void;
  loadHistory: () => void;
  clearHistory: () => void;
  restoreFromHistory: (recordId: string) => void;
  resetRoute: () => void;
  getRouteSnapshot: () => FlightRoute | null;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const loadHistoryFromStorage = (): HistoryRecord[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveHistoryToStorage = (history: HistoryRecord[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
};

export const useFlightStore = create<FlightState>((set, get) => ({
  currentRoute: null,
  selectedWaypointId: null,
  isEditing: true,
  storms,
  noFlyZones,
  airports,
  aircraftSpec: defaultAircraft,
  collisionResult: null,
  fuelResult: null,
  history: [],

  initRoute: () => {
    const now = new Date().toISOString();
    const initialRoute: FlightRoute = {
      id: generateId(),
      name: '新航线规划',
      waypoints: [
        { ...airports[0] },
        { ...airports[1] },
      ],
      cruiseAlt: 10000,
      aircraftType: defaultAircraft.type,
      createdAt: now,
      updatedAt: now,
    };

    set({ currentRoute: initialRoute });
    get().validateRoute();
  },

  addWaypoint: (waypoint: Waypoint, position?: number) => {
    const { currentRoute } = get();
    if (!currentRoute) return;

    const newWaypoints = [...currentRoute.waypoints];
    const insertPosition = position !== undefined ? position : newWaypoints.length - 1;
    newWaypoints.splice(insertPosition, 0, waypoint);

    set({
      currentRoute: {
        ...currentRoute,
        waypoints: newWaypoints,
        updatedAt: new Date().toISOString(),
      },
    });

    get().validateRoute();
    get().saveRoute(`添加航点: ${waypoint.name}`);
  },

  updateWaypoint: (id: string, updates: Partial<Waypoint>) => {
    const { currentRoute } = get();
    if (!currentRoute) return;

    const waypoint = currentRoute.waypoints.find(w => w.id === id);
    if (!waypoint) return;

    const newWaypoints = currentRoute.waypoints.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );

    set({
      currentRoute: {
        ...currentRoute,
        waypoints: newWaypoints,
        updatedAt: new Date().toISOString(),
      },
    });

    get().validateRoute();
    get().saveRoute(`更新航点: ${waypoint.name}`);
  },

  removeWaypoint: (id: string) => {
    const { currentRoute } = get();
    if (!currentRoute || currentRoute.waypoints.length <= 2) return;

    const waypoint = currentRoute.waypoints.find(w => w.id === id);
    const newWaypoints = currentRoute.waypoints.filter(w => w.id !== id);

    set({
      currentRoute: {
        ...currentRoute,
        waypoints: newWaypoints,
        updatedAt: new Date().toISOString(),
      },
      selectedWaypointId: null,
    });

    get().validateRoute();
    if (waypoint) {
      get().saveRoute(`删除航点: ${waypoint.name}`);
    }
  },

  moveWaypoint: (id: string, lat: number, lng: number) => {
    const { currentRoute } = get();
    if (!currentRoute) return;

    const newWaypoints = currentRoute.waypoints.map(w =>
      w.id === id ? { ...w, lat, lng } : w
    );

    set({
      currentRoute: {
        ...currentRoute,
        waypoints: newWaypoints,
        updatedAt: new Date().toISOString(),
      },
    });

    get().validateRoute();
  },

  selectWaypoint: (id: string | null) => {
    set({ selectedWaypointId: id });
  },

  setCruiseAlt: (alt: number) => {
    const { currentRoute } = get();
    if (!currentRoute) return;

    set({
      currentRoute: {
        ...currentRoute,
        cruiseAlt: alt,
        updatedAt: new Date().toISOString(),
      },
    });

    get().validateRoute();
    get().saveRoute(`调整巡航高度至 ${alt} 米`);
  },

  setAircraftSpec: (spec: AircraftSpec) => {
    set({ aircraftSpec: spec });
    const { currentRoute } = get();
    if (currentRoute) {
      set({
        currentRoute: {
          ...currentRoute,
          aircraftType: spec.type,
          updatedAt: new Date().toISOString(),
        },
      });
    }
    get().validateRoute();
    get().saveRoute(`更换机型为 ${spec.name}`);
  },

  setEditing: (editing: boolean) => {
    set({ isEditing: editing });
  },

  updateRouteName: (name: string) => {
    const { currentRoute } = get();
    if (!currentRoute) return;

    set({
      currentRoute: {
        ...currentRoute,
        name,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  validateRoute: () => {
    const { currentRoute, aircraftSpec, storms, noFlyZones } = get();
    if (!currentRoute || currentRoute.waypoints.length < 2) {
      set({ collisionResult: null, fuelResult: null });
      return;
    }

    const collisionResult = checkAllCollisions(
      currentRoute.waypoints,
      currentRoute.cruiseAlt,
      storms,
      noFlyZones
    );

    const fuelResult = calculateFuel(
      currentRoute.waypoints,
      currentRoute.cruiseAlt,
      aircraftSpec
    );

    set({ collisionResult, fuelResult });
  },

  saveRoute: (description?: string) => {
    const { currentRoute, collisionResult, fuelResult, history } = get();
    if (!currentRoute) return;

    const record: HistoryRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: 'update',
      description: description || '更新航线',
      routeSnapshot: JSON.parse(JSON.stringify(currentRoute)),
      operator: 'student',
      collisionResult: collisionResult ? JSON.parse(JSON.stringify(collisionResult)) : undefined,
      fuelResult: fuelResult ? JSON.parse(JSON.stringify(fuelResult)) : undefined,
    };

    const newHistory = [record, ...history].slice(0, MAX_HISTORY);
    set({ history: newHistory });
    saveHistoryToStorage(newHistory);
  },

  loadHistory: () => {
    const history = loadHistoryFromStorage();
    set({ history });
  },

  clearHistory: () => {
    set({ history: [] });
    localStorage.removeItem(HISTORY_KEY);
  },

  restoreFromHistory: (recordId: string) => {
    const { history } = get();
    const record = history.find(r => r.id === recordId);
    if (!record) return;

    set({
      currentRoute: JSON.parse(JSON.stringify(record.routeSnapshot)),
      selectedWaypointId: null,
    });

    get().validateRoute();
    get().saveRoute('从历史记录恢复航线');
  },

  resetRoute: () => {
    get().initRoute();
    get().saveRoute('重置航线');
  },

  getRouteSnapshot: () => {
    const { currentRoute } = get();
    return currentRoute ? JSON.parse(JSON.stringify(currentRoute)) : null;
  },
}));
