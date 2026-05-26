import { create } from 'zustand';
import {
  GameState,
  Station,
  Route,
  Vehicle,
  GameEvent,
  Anomaly,
  ActionRecord,
  ScoreBreakdown,
  GameStats,
} from '../types';
import { levels } from '../data/levels';

const initialScoreBreakdown: ScoreBreakdown = {
  punctuality: { score: 30, maxScore: 30, details: [] },
  coverage: { score: 20, maxScore: 20, details: [] },
  satisfaction: { score: 25, maxScore: 25, details: [] },
  efficiency: { score: 15, maxScore: 15, details: [] },
  response: { score: 10, maxScore: 10, details: [] },
  penalties: { total: 0, details: [] },
};

const initialStats: GameStats = {
  totalArrivals: 0,
  onTimeArrivals: 0,
  totalStopsServed: 0,
  totalStopsMissed: 0,
  totalPassengersServed: 0,
  totalComplaints: 0,
  eventsHandled: 0,
  eventsMissed: 0,
  detourDistance: 0,
  normalDistance: 0,
};

interface GameStore extends GameState {
  initGame: (levelId: number) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: () => void;
  setSpeed: (speed: number) => void;
  updateGameTime: (delta: number) => void;
  updateVehicles: (updater: (vehicles: Vehicle[]) => Vehicle[]) => void;
  updateVehicle: (vehicleId: string, updater: (vehicle: Vehicle) => Vehicle) => void;
  updateStations: (updater: (stations: Station[]) => Station[]) => void;
  updateRoutes: (updater: (routes: Route[]) => Route[]) => void;
  updateRoute: (routeId: string, updater: (route: Route) => Route) => void;
  addEvent: (event: Omit<GameEvent, 'id' | 'resolved'>) => void;
  resolveEvent: (eventId: string) => void;
  addAnomaly: (anomaly: Omit<Anomaly, 'id'>) => void;
  resolveAnomaly: (anomalyId: string) => void;
  addActionLog: (action: Omit<ActionRecord, 'id'>) => void;
  setScore: (score: number) => void;
  setSatisfaction: (satisfaction: number) => void;
  updateScoreBreakdown: (updater: (breakdown: ScoreBreakdown) => ScoreBreakdown) => void;
  updateStats: (updater: (stats: GameStats) => GameStats) => void;
  reroute: (routeId: string, newStations: string[]) => void;
  dispatchVehicle: (routeId: string) => void;
  adjustInterval: (routeId: string, newInterval: number) => void;
  suspendRoute: (routeId: string) => void;
  resumeRoute: (routeId: string) => void;
  history: GameState[];
  saveHistory: () => void;
  loadHistory: (index: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  gameTime: 0,
  realTime: 0,
  speed: 1,
  totalScore: 100,
  satisfaction: 100,
  stations: [],
  routes: [],
  vehicles: [],
  events: [],
  anomalies: [],
  actionLog: [],
  scoreBreakdown: initialScoreBreakdown,
  level: 1,
  gameDuration: 300,
  stats: initialStats,
  history: [],

  initGame: (levelId: number) => {
    const level = levels.find(l => l.id === levelId) || levels[0];
    set({
      status: 'idle',
      gameTime: 0,
      realTime: 0,
      speed: 1,
      totalScore: 100,
      satisfaction: 100,
      stations: JSON.parse(JSON.stringify(level.stations)),
      routes: JSON.parse(JSON.stringify(level.routes)),
      vehicles: JSON.parse(JSON.stringify(level.vehicles)),
      events: [],
      anomalies: [],
      actionLog: [],
      scoreBreakdown: JSON.parse(JSON.stringify(initialScoreBreakdown)),
      level: levelId,
      gameDuration: level.duration,
      stats: JSON.parse(JSON.stringify(initialStats)),
      history: [],
    });
  },

  startGame: () => set({ status: 'playing' }),
  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),
  restartGame: () => {
    const { level } = get();
    get().initGame(level);
  },
  endGame: () => set({ status: 'ended' }),
  setSpeed: (speed) => set({ speed }),

  updateGameTime: (delta) => {
    set((state) => ({
      gameTime: state.gameTime + delta,
      realTime: state.realTime + delta,
    }));
  },

  updateVehicles: (updater) => set((state) => ({ vehicles: updater(state.vehicles) })),
  updateVehicle: (vehicleId, updater) =>
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId ? updater(v) : v
      ),
    })),

  updateStations: (updater) => set((state) => ({ stations: updater(state.stations) })),

  updateRoutes: (updater) => set((state) => ({ routes: updater(state.routes) })),
  updateRoute: (routeId, updater) =>
    set((state) => ({
      routes: state.routes.map((r) =>
        r.id === routeId ? updater(r) : r
      ),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, { ...event, id: `e${Date.now()}`, resolved: false }],
    })),

  resolveEvent: (eventId) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, resolved: true } : e
      ),
    })),

  addAnomaly: (anomaly) =>
    set((state) => ({
      anomalies: [...state.anomalies, { ...anomaly, id: `a${Date.now()}` }],
    })),

  resolveAnomaly: (anomalyId) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === anomalyId ? { ...a, resolved: true } : a
      ),
    })),

  addActionLog: (action) =>
    set((state) => ({
      actionLog: [...state.actionLog, { ...action, id: `act${Date.now()}` }],
    })),

  setScore: (score) => set({ totalScore: Math.max(0, Math.min(100, score)) }),
  setSatisfaction: (satisfaction) => set({ satisfaction: Math.max(0, Math.min(100, satisfaction)) }),

  updateScoreBreakdown: (updater) =>
    set((state) => ({ scoreBreakdown: updater(state.scoreBreakdown) })),

  updateStats: (updater) => set((state) => ({ stats: updater(state.stats) })),

  reroute: (routeId, newStations) => {
    const { routes, gameTime } = get();
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    get().updateRoute(routeId, (r) => ({
      ...r,
      stations: newStations,
      status: newStations.length !== r.originalStations.length ||
        newStations.some((s, i) => s !== r.originalStations[i])
        ? 'detoured'
        : 'normal',
    }));

    get().addActionLog({
      type: 'reroute',
      timestamp: gameTime,
      description: `调整 ${route.name} 线路`,
      details: { oldStations: route.stations, newStations },
    });
  },

  dispatchVehicle: (routeId) => {
    const { routes, vehicles, gameTime } = get();
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    const newVehicle: Vehicle = {
      id: `v${Date.now()}`,
      routeId,
      plateNumber: `京A-${String(vehicles.length + 1).padStart(4, '0')}`,
      currentStationIndex: 0,
      nextStationTime: route.interval,
      passengers: 0,
      capacity: 50,
      status: 'running',
      delayTime: 0,
      progress: 0,
    };

    set((state) => ({
      vehicles: [...state.vehicles, newVehicle],
      routes: state.routes.map((r) =>
        r.id === routeId ? { ...r, vehicles: [...r.vehicles, newVehicle.id] } : r
      ),
    }));

    get().addActionLog({
      type: 'dispatch',
      timestamp: gameTime,
      description: `向 ${route.name} 增派车辆 ${newVehicle.plateNumber}`,
      details: { vehicleId: newVehicle.id },
    });
  },

  adjustInterval: (routeId, newInterval) => {
    const { routes, gameTime } = get();
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    get().updateRoute(routeId, (r) => ({ ...r, interval: newInterval }));

    get().addActionLog({
      type: 'adjust_interval',
      timestamp: gameTime,
      description: `调整 ${route.name} 发车间隔为 ${newInterval}秒`,
      details: { oldInterval: route.interval, newInterval },
    });
  },

  suspendRoute: (routeId) => {
    const { routes, gameTime } = get();
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    get().updateRoute(routeId, (r) => ({ ...r, status: 'suspended' }));

    get().addActionLog({
      type: 'suspend',
      timestamp: gameTime,
      description: `暂停 ${route.name} 运营`,
      details: {},
    });
  },

  resumeRoute: (routeId) => {
    const { routes, gameTime } = get();
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    get().updateRoute(routeId, (r) => ({
      ...r,
      status: r.stations.length !== r.originalStations.length ||
        r.stations.some((s, i) => s !== r.originalStations[i])
        ? 'detoured'
        : 'normal',
    }));

    get().addActionLog({
      type: 'resume',
      timestamp: gameTime,
      description: `恢复 ${route.name} 运营`,
      details: {},
    });
  },

  saveHistory: () => {
    const state = get();
    const historyEntry = JSON.parse(JSON.stringify({
      status: state.status,
      gameTime: state.gameTime,
      realTime: state.realTime,
      speed: state.speed,
      totalScore: state.totalScore,
      satisfaction: state.satisfaction,
      stations: state.stations,
      routes: state.routes,
      vehicles: state.vehicles,
      events: state.events,
      anomalies: state.anomalies,
      actionLog: state.actionLog,
      scoreBreakdown: state.scoreBreakdown,
      level: state.level,
      gameDuration: state.gameDuration,
      stats: state.stats,
    }));
    set((state) => ({
      history: [...state.history, historyEntry],
    }));
  },

  loadHistory: (index) => {
    const { history } = get();
    if (index < 0 || index >= history.length) return;
    const entry = history[index];
    set({
      ...entry,
      history: get().history,
    });
  },
}));
