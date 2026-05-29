import { create } from 'zustand';
import {
  GameState,
  Gate,
  Exit,
  Broadcast,
  LockdownArea,
  DiversionRoute,
  Alert,
  GameResult,
  Passenger,
  BroadcastLog,
  Penalty,
  GateStatus,
} from '../types';
import { getStationMap } from '../data/stationMaps';
import { getLevel } from '../data/levels';
import { loadBroadcasts } from '../data/broadcasts';
import {
  simulatePassengerMovement,
  updateExitCongestion,
  spawnPassengers,
} from '../engine/PassengerSimulator';
import { createPenalty, checkBroadcastTriggers } from '../utils/penaltyUtils';
import { calculateScore, generateGameResult } from '../engine/ScoreCalculator';

const GATE_CONFIG_KEY = 'metro_evacuation_gate_config';
const RESULTS_KEY = 'metro_evacuation_results';
const LAST_RESULT_KEY = 'metro_evacuation_last_result';

interface GameStore extends GameState {
  broadcasts: Broadcast[];
  results: GameResult[];
  lastResultId: string | null;
  passengerIdCounter: number;
  lastSpawnTime: number;
  lastPenaltyCheckTime: number;
  broadcastLastPlayed: Record<string, number>;
  activeRipple: { x: number; y: number; id: string } | null;
  initGame: (levelId: string) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  gameTick: () => void;
  playBroadcast: (broadcastId: string) => void;
  setGateStatus: (gateId: string, status: GateStatus) => void;
  setLockdownArea: (gateId: string) => void;
  clearLockdownArea: (gateId: string) => void;
  setDiversionRoute: (fromGateId: string, toExitId: string) => void;
  clearDiversionRoute: (fromGateId: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  clearAlert: (alertId: string) => void;
  setSelectedLocation: (locationId: string | null) => void;
  saveResult: () => GameResult;
  loadResults: () => void;
  setActiveRipple: (ripple: { x: number; y: number; id: string } | null) => void;
}

const createInitialState = (levelId: string): Partial<GameStore> => {
  const level = getLevel(levelId);
  const stationMap = level ? getStationMap(level.mapId) : undefined;

  if (!level || !stationMap) {
    return {};
  }

  let gates: Gate[] = [];
  try {
    const stored = localStorage.getItem(`${GATE_CONFIG_KEY}_${stationMap.id}`);
    if (stored) {
      gates = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load gate config:', e);
  }

  if (gates.length === 0) {
    gates = stationMap.gates.map((gate) => ({
      ...gate,
      status: level.initialFaultyGates.includes(gate.id) ? 'faulty' : 'normal',
      isFaulty: level.initialFaultyGates.includes(gate.id),
    }));
  } else {
    gates = gates.map((gate) => ({
      ...gate,
      status: level.initialFaultyGates.includes(gate.id) ? 'faulty' : gate.status,
      isFaulty: level.initialFaultyGates.includes(gate.id),
    }));
  }

  const exits: Exit[] = stationMap.exits.map((exit) => ({
    ...exit,
    congestionLevel: 0,
  }));

  const broadcasts = loadBroadcasts();

  return {
    id: `game-${Date.now()}`,
    levelId,
    status: 'idle',
    currentTime: 0,
    totalDuration: level.duration,
    score: 1000,
    passengers: [],
    gates,
    exits,
    broadcastLogs: [],
    penalties: [],
    alerts: [],
    lockdownAreas: [],
    diversionRoutes: [],
    broadcastCooldowns: {},
    activeBroadcastId: null,
    selectedLocationId: null,
    broadcasts,
    passengerIdCounter: 0,
    lastSpawnTime: 0,
    lastPenaltyCheckTime: 0,
    broadcastLastPlayed: {},
    activeRipple: null,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  id: '',
  levelId: '',
  status: 'idle',
  currentTime: 0,
  totalDuration: 180,
  score: 1000,
  passengers: [],
  gates: [],
  exits: [],
  broadcastLogs: [],
  penalties: [],
  alerts: [],
  lockdownAreas: [],
  diversionRoutes: [],
  broadcastCooldowns: {},
  activeBroadcastId: null,
  selectedLocationId: null,
  broadcasts: [],
  results: [],
  lastResultId: null,
  passengerIdCounter: 0,
  lastSpawnTime: 0,
  lastPenaltyCheckTime: 0,
  broadcastLastPlayed: {},
  activeRipple: null,

  initGame: (levelId: string) => {
    const initialState = createInitialState(levelId);
    set(initialState);
    get().loadResults();
  },

  startGame: () => {
    set({ status: 'playing' });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  endGame: () => {
    const state = get();
    const result = state.saveResult();
    set({ status: 'finished', lastResultId: result.id });
  },

  resetGame: () => {
    const state = get();
    get().initGame(state.levelId);
  },

  gameTick: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const level = getLevel(state.levelId);
    const stationMap = level ? getStationMap(level.mapId) : undefined;
    if (!level || !stationMap) return;

    const newTime = state.currentTime + 1;
    let newPassengers = [...state.passengers];
    let newPenalties = [...state.penalties];
    let newAlerts = [...state.alerts];

    if (newTime - state.lastSpawnTime >= 2) {
      const spawnCount = Math.floor(level.passengerSpawnRate * 2);
      const newPs = spawnPassengers(
        spawnCount,
        state.passengerIdCounter,
        newTime,
        state.gates,
        state.exits,
        state.lockdownAreas,
        stationMap.entrances
      );
      newPassengers = [...newPassengers, ...newPs];
      set({
        passengerIdCounter: state.passengerIdCounter + spawnCount,
        lastSpawnTime: newTime,
      });
    }

    const recentDiversionBroadcasts = state.broadcastLogs
      .filter((log) => newTime - log.timestamp < 10)
      .map((log) => log.broadcastId);

    newPassengers = newPassengers.map((passenger) =>
      simulatePassengerMovement(
        passenger,
        state.gates,
        state.exits,
        state.lockdownAreas,
        state.diversionRoutes,
        recentDiversionBroadcasts,
        newTime,
        newPassengers
      )
    );

    const newExits = updateExitCongestion(state.exits, newPassengers);

    const newCooldowns: Record<string, number> = {};
    for (const [broadcastId, remaining] of Object.entries(state.broadcastCooldowns)) {
      if (remaining > 1) {
        newCooldowns[broadcastId] = remaining - 1;
      }
    }

    if (newTime - state.lastPenaltyCheckTime >= 5) {
      for (const exit of newExits) {
        if (exit.congestionLevel > 0.8) {
          const existingPenalty = newPenalties.find(
            (p) => p.locationRef === exit.id && p.reason === '出口拥堵超过阈值' && newTime - p.timestamp < 10
          );
          if (!existingPenalty) {
            const penalty = createPenalty(
              'exit_congestion_high',
              exit.id,
              newTime,
              state.gates,
              newExits
            );
            newPenalties.push(penalty);
            newAlerts.push({
              id: `alert-${Date.now()}-${Math.random()}`,
              type: 'danger',
              message: `${exit.name}严重拥堵！`,
              locationRef: exit.id,
              timestamp: newTime,
            });
          }
        } else if (exit.congestionLevel > 0.6) {
          const existingPenalty = newPenalties.find(
            (p) => p.locationRef === exit.id && p.reason === '出口拥堵接近阈值' && newTime - p.timestamp < 15
          );
          if (!existingPenalty) {
            const penalty = createPenalty(
              'exit_congestion_medium',
              exit.id,
              newTime,
              state.gates,
              newExits
            );
            newPenalties.push(penalty);
            newAlerts.push({
              id: `alert-${Date.now()}-${Math.random()}`,
              type: 'warning',
              message: `${exit.name}拥堵预警`,
              locationRef: exit.id,
              timestamp: newTime,
            });
          }
        }
      }

      for (const gate of state.gates) {
        if (gate.isFaulty) {
          const hasLockdown = state.lockdownAreas.some(
            (area) =>
              gate.position.x >= area.x &&
              gate.position.x + gate.width <= area.x + area.width &&
              gate.position.y >= area.y &&
              gate.position.y + gate.height <= area.y + area.height
          );

          if (!hasLockdown && newTime > 30) {
            const existingPenalty = newPenalties.find(
              (p) => p.locationRef === gate.id && p.reason === '故障闸机未设置封控区'
            );
            if (!existingPenalty) {
              const penalty = createPenalty(
                'no_lockdown_for_faulty_gate',
                gate.id,
                newTime,
                state.gates,
                newExits
              );
              newPenalties.push(penalty);
            }
          }

          if (gate.status === 'normal') {
            const existingPenalty = newPenalties.find(
              (p) => p.locationRef === gate.id && p.reason === '故障闸机未及时关闭'
            );
            if (!existingPenalty) {
              const penalty = createPenalty(
                'gate_not_restricted',
                gate.id,
                newTime,
                state.gates,
                newExits
              );
              newPenalties.push(penalty);
            }
          }
        }
      }

      for (const passenger of newPassengers) {
        if (passenger.status === 'stuck') {
          const stuckTime = newTime - passenger.enteredAt;
          if (stuckTime > 45) {
            const existingPenalty = newPenalties.find(
              (p) =>
                p.category === 'safety_risk' &&
                p.reason === '乘客长时间滞留' &&
                newTime - p.timestamp < 20
            );
            if (!existingPenalty) {
              const nearestExit = newExits.reduce((nearest, exit) => {
                const dist = Math.hypot(
                  passenger.position.x - exit.position.x,
                  passenger.position.y - exit.position.y
                );
                const nearestDist = Math.hypot(
                  passenger.position.x - nearest.position.x,
                  passenger.position.y - nearest.position.y
                );
                return dist < nearestDist ? exit : nearest;
              });
              const penalty = createPenalty(
                'passenger_stuck',
                nearestExit.id,
                newTime,
                state.gates,
                newExits,
                { stuckSeconds: stuckTime }
              );
              newPenalties.push(penalty);
            }
          }
        }
      }

      const missedBroadcasts = checkBroadcastTriggers(
        state.gates,
        newExits,
        state.broadcasts,
        newTime,
        state.broadcastLastPlayed
      );

      for (const missed of missedBroadcasts) {
        const existingPenalty = newPenalties.find(
          (p) =>
            p.category === 'missed_broadcast' &&
            p.locationRef === missed.locationRef &&
            newTime - p.timestamp < 15
        );
        if (!existingPenalty) {
          const penalty = createPenalty(
            'missed_broadcast',
            missed.locationRef,
            newTime,
            state.gates,
            newExits,
            {
              broadcastTitle: missed.broadcast.title,
              delaySeconds: missed.delay,
            }
          );
          newPenalties.push(penalty);
        }
      }

      set({ lastPenaltyCheckTime: newTime });
    }

    newAlerts = newAlerts.filter((a) => newTime - a.timestamp < 10);

    const newScore = calculateScore({
      ...state,
      currentTime: newTime,
      passengers: newPassengers,
      exits: newExits,
      penalties: newPenalties,
    });

    if (newTime >= state.totalDuration) {
      set({
        currentTime: newTime,
        passengers: newPassengers,
        exits: newExits,
        penalties: newPenalties,
        alerts: newAlerts,
        broadcastCooldowns: newCooldowns,
        score: newScore,
      });
      get().endGame();
      return;
    }

    set({
      currentTime: newTime,
      passengers: newPassengers,
      exits: newExits,
      penalties: newPenalties,
      alerts: newAlerts,
      broadcastCooldowns: newCooldowns,
      score: newScore,
    });
  },

  playBroadcast: (broadcastId: string) => {
    const state = get();
    const broadcast = state.broadcasts.find((b) => b.id === broadcastId);
    if (!broadcast) return;

    const remainingCooldown = state.broadcastCooldowns[broadcastId] ?? 0;
    if (remainingCooldown > 0) {
      const lastPlayed = state.broadcastLastPlayed[broadcastId] ?? 0;
      const timeSinceLast = state.currentTime - lastPlayed;
      const penalty = createPenalty(
        'broadcast_cooldown_violation',
        broadcast.relatedLocations[0] || 'area-general',
        state.currentTime,
        state.gates,
        state.exits,
        {
          broadcastTitle: broadcast.title,
          cooldown: broadcast.cooldownSeconds,
          timeSinceLast,
        }
      );
      set({
        penalties: [...state.penalties, penalty],
      });
      return;
    }

    const log: BroadcastLog = {
      id: `log-${Date.now()}`,
      broadcastId,
      timestamp: state.currentTime,
      wasMissed: false,
      locationRef: broadcast.relatedLocations[0],
    };

    const centerPoint = broadcast.relatedLocations[0]
      ? state.gates.find((g) => g.id === broadcast.relatedLocations[0])?.position ||
        state.exits.find((e) => e.id === broadcast.relatedLocations[0])?.position
      : null;

    if (centerPoint) {
      set({
        activeRipple: {
          x: centerPoint.x + 20,
          y: centerPoint.y + 40,
          id: `ripple-${Date.now()}`,
        },
      });
      setTimeout(() => {
        set({ activeRipple: null });
      }, 1000);
    }

    set({
      broadcastLogs: [...state.broadcastLogs, log],
      broadcastCooldowns: {
        ...state.broadcastCooldowns,
        [broadcastId]: broadcast.cooldownSeconds,
      },
      broadcastLastPlayed: {
        ...state.broadcastLastPlayed,
        [broadcastId]: state.currentTime,
      },
      activeBroadcastId: broadcastId,
    });

    setTimeout(() => {
      set({ activeBroadcastId: null });
    }, 3000);
  },

  setGateStatus: (gateId: string, status: GateStatus) => {
    const state = get();
    const gates = state.gates.map((g) =>
      g.id === gateId ? { ...g, status } : g
    );
    set({ gates });
  },

  setLockdownArea: (gateId: string) => {
    const state = get();
    const gate = state.gates.find((g) => g.id === gateId);
    if (!gate) return;

    const existingArea = state.lockdownAreas.find((a) => a.id === `lockdown-${gateId}`);
    if (existingArea) return;

    const area: LockdownArea = {
      id: `lockdown-${gateId}`,
      name: `${gate.name}封控区`,
      x: gate.position.x - 20,
      y: gate.position.y - 20,
      width: gate.width + 40,
      height: gate.height + 40,
    };

    set({
      lockdownAreas: [...state.lockdownAreas, area],
    });

    get().addAlert({
      type: 'info',
      message: `已设置${gate.name}封控区`,
      locationRef: gateId,
    });
  },

  clearLockdownArea: (gateId: string) => {
    const state = get();
    set({
      lockdownAreas: state.lockdownAreas.filter((a) => a.id !== `lockdown-${gateId}`),
    });
  },

  setDiversionRoute: (fromGateId: string, toExitId: string) => {
    const state = get();
    const existingRoute = state.diversionRoutes.find((r) => r.fromGateId === fromGateId);

    let newRoutes: DiversionRoute[];
    if (existingRoute) {
      const targetExit = state.exits.find((e) => e.id === toExitId);
      if (targetExit && targetExit.congestionLevel > 0.6) {
        const penalty = createPenalty(
          'wrong_diversion',
          fromGateId,
          state.currentTime,
          state.gates,
          state.exits,
          {
            toExitId,
            targetCongestion: targetExit.congestionLevel,
          }
        );
        set({
          penalties: [...state.penalties, penalty],
        });
      }

      newRoutes = state.diversionRoutes.map((r) =>
        r.fromGateId === fromGateId ? { ...r, toExitId } : r
      );
    } else {
      newRoutes = [...state.diversionRoutes, { fromGateId, toExitId }];
    }

    set({ diversionRoutes: newRoutes });
  },

  clearDiversionRoute: (fromGateId: string) => {
    const state = get();
    set({
      diversionRoutes: state.diversionRoutes.filter((r) => r.fromGateId !== fromGateId),
    });
  },

  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const state = get();
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: state.currentTime,
    };
    set({ alerts: [...state.alerts, newAlert] });
  },

  clearAlert: (alertId: string) => {
    const state = get();
    set({ alerts: state.alerts.filter((a) => a.id !== alertId) });
  },

  setSelectedLocation: (locationId: string | null) => {
    set({ selectedLocationId: locationId });
  },

  saveResult: (): GameResult => {
    const state = get();
    const broadcastSnapshot = state.broadcasts.map((b) => ({ ...b }));

    const result = generateGameResult(state, state.gates, state.exits, broadcastSnapshot);

    const existingResults = state.results.filter((r) => r.gameId !== state.id);
    const newResults = [...existingResults, result];

    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(newResults));
      localStorage.setItem(LAST_RESULT_KEY, result.id);
    } catch (e) {
      console.error('Failed to save result:', e);
    }

    set({ results: newResults, lastResultId: result.id });
    return result;
  },

  loadResults: () => {
    try {
      const stored = localStorage.getItem(RESULTS_KEY);
      const lastId = localStorage.getItem(LAST_RESULT_KEY);
      if (stored) {
        set({
          results: JSON.parse(stored),
          lastResultId: lastId,
        });
      }
    } catch (e) {
      console.error('Failed to load results:', e);
    }
  },

  setActiveRipple: (ripple) => {
    set({ activeRipple: ripple });
  },
}));

export const loadGateConfig = (mapId: string): Gate[] => {
  try {
    const stored = localStorage.getItem(`${GATE_CONFIG_KEY}_${mapId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load gate config:', e);
  }
  return [];
};

export const saveGateConfig = (mapId: string, gates: Gate[]): void => {
  try {
    localStorage.setItem(`${GATE_CONFIG_KEY}_${mapId}`, JSON.stringify(gates));
  } catch (e) {
    console.error('Failed to save gate config:', e);
  }
};
