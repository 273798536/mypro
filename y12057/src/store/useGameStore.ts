import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  GameState, 
  GameStatus, 
  Deployment, 
  GameEvent, 
  Decision,
  GameSnapshot,
  SecurityUnitType,
  WeatherCondition,
  GameScore,
  GameHistory,
  DataSource
} from '../engine/types';
import { severityToNumber } from '../engine/types';
import { CrowdSimulator } from '../engine/crowdSimulator';
import { EventSystem } from '../engine/eventSystem';
import { ScoringEngine } from '../engine/scoring';
import { festivalMaps, mapDataSources } from '../data/maps';
import { allDataSources } from '../data/patrols';
import { generateGameHistoryHash } from '../utils/deduplication';
import { 
  saveGameState, 
  saveGameHistory, 
  saveSnapshot,
  setCurrentGameId 
} from '../utils/storage';

interface GameStore {
  state: GameState | null;
  crowdSimulator: CrowdSimulator | null;
  eventSystem: EventSystem | null;
  scoringEngine: ScoringEngine;
  availableDataSources: DataSource[];
  isLoading: boolean;
  error: string | null;

  initializeGame: (mapId?: string) => Promise<void>;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => Promise<void>;
  endGame: () => void;

  addDeployment: (unitType: SecurityUnitType, x: number, y: number, count: number) => void;
  removeDeployment: (deploymentId: string) => void;
  updateDeployment: (deploymentId: string, updates: Partial<Deployment>) => void;

  resolveEvent: (eventId: string, action: string, dataSourceIds?: string[]) => void;
  markDecisionCritical: (decisionId: string, isCritical: boolean) => void;

  setSpeed: (speed: number) => void;
  tick: (deltaTime: number) => void;

  getDataSourceById: (id: string) => DataSource | undefined;
  getEventDataSource: (eventId: string) => DataSource | undefined;
}

const createInitialState = (mapId: string): GameState => {
  const map = festivalMaps.find(m => m.id === mapId) || festivalMaps[0];
  return {
    id: uuidv4(),
    mapId: map.id,
    startTime: Date.now(),
    endTime: 0,
    status: 'deploying',
    speed: 1,
    currentTime: 0,
    weather: 'clear',
    crowdParticles: [],
    deployments: [],
    events: [],
    decisions: [],
    score: null,
    congestionIndex: 0,
    patrolCoverage: 0,
    riskLevel: 1,
    snapshots: []
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  crowdSimulator: null,
  eventSystem: null,
  scoringEngine: new ScoringEngine(),
  availableDataSources: [...mapDataSources, ...allDataSources],
  isLoading: false,
  error: null,

  initializeGame: async (mapId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const selectedMapId = mapId || festivalMaps[0].id;
      const map = festivalMaps.find(m => m.id === selectedMapId) || festivalMaps[0];
      
      const initialState = createInitialState(selectedMapId);
      const crowdSimulator = new CrowdSimulator(map);
      const eventSystem = new EventSystem(map);
      
      const particles = crowdSimulator.initializeParticles(300);
      initialState.crowdParticles = particles;
      
      setCurrentGameId(initialState.id);
      
      set({
        state: initialState,
        crowdSimulator,
        eventSystem,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '初始化失败',
        isLoading: false 
      });
    }
  },

  startGame: () => {
    const { state } = get();
    if (!state || state.status !== 'deploying') return;

    set({
      state: {
        ...state,
        status: 'running',
        startTime: Date.now()
      }
    });
  },

  pauseGame: () => {
    const { state } = get();
    if (!state || state.status !== 'running') return;

    set({
      state: {
        ...state,
        status: 'paused'
      }
    });
  },

  resumeGame: () => {
    const { state } = get();
    if (!state || state.status !== 'paused') return;

    set({
      state: {
        ...state,
        status: 'running'
      }
    });
  },

  restartGame: async () => {
    const { state } = get();
    if (!state) return;

    await get().initializeGame(state.mapId);
  },

  endGame: () => {
    const { state, scoringEngine } = get();
    if (!state) return;

    scoringEngine.resetDeductions();
    const score = scoringEngine.calculateScore(state);

    const finalState: GameState = {
      ...state,
      status: 'finished',
      endTime: Date.now(),
      score
    };

    const history: GameHistory = {
      id: uuidv4(),
      gameId: state.id,
      mapName: festivalMaps.find(m => m.id === state.mapId)?.name || '未知地图',
      startTime: state.startTime,
      endTime: Date.now(),
      finalScore: score.totalScore,
      grade: score.grade,
      totalDeductions: score.deductions.reduce((sum, d) => sum + d.points, 0),
      hash: generateGameHistoryHash(
        state.id,
        state.mapId,
        state.startTime,
        state.decisions,
        score.deductions
      ),
      createdAt: Date.now()
    };

    saveGameState(finalState);
    saveGameHistory(history);

    set({ state: finalState });
  },

  addDeployment: (unitType: SecurityUnitType, x: number, y: number, count: number) => {
    const { state } = get();
    if (!state || state.status === 'finished') return;

    const deployment: Deployment = {
      id: uuidv4(),
      gameId: state.id,
      unitType,
      x,
      y,
      count,
      deployedAt: state.currentTime
    };

    const decision: Decision = {
      id: uuidv4(),
      gameId: state.id,
      action: `部署${unitType === 'fixed_post' ? '固定岗' : unitType === 'patrol' ? '巡逻队' : '应急队'} ${count}人于位置(${Math.round(x)}, ${Math.round(y)})`,
      timestamp: state.currentTime,
      dataSourceIds: [],
      result: '已部署',
      markedCritical: false
    };

    set({
      state: {
        ...state,
        deployments: [...state.deployments, deployment],
        decisions: [...state.decisions, decision]
      }
    });
  },

  removeDeployment: (deploymentId: string) => {
    const { state } = get();
    if (!state || state.status === 'finished') return;

    const deployment = state.deployments.find(d => d.id === deploymentId);
    if (!deployment) return;

    const decision: Decision = {
      id: uuidv4(),
      gameId: state.id,
      action: `撤回${deployment.unitType === 'fixed_post' ? '固定岗' : deployment.unitType === 'patrol' ? '巡逻队' : '应急队'}部署`,
      timestamp: state.currentTime,
      dataSourceIds: [],
      result: '已撤回',
      markedCritical: false
    };

    set({
      state: {
        ...state,
        deployments: state.deployments.filter(d => d.id !== deploymentId),
        decisions: [...state.decisions, decision]
      }
    });
  },

  updateDeployment: (deploymentId: string, updates: Partial<Deployment>) => {
    const { state } = get();
    if (!state || state.status === 'finished') return;

    set({
      state: {
        ...state,
        deployments: state.deployments.map(d =>
          d.id === deploymentId ? { ...d, ...updates } : d
        )
      }
    });
  },

  resolveEvent: (eventId: string, action: string, dataSourceIds: string[] = []) => {
    const { state } = get();
    if (!state) return;

    const event = state.events.find(e => e.id === eventId);
    if (!event || event.resolved) return;

    const updatedEvents = state.events.map(e =>
      e.id === eventId
        ? { ...e, resolved: true, resolutionTime: state.currentTime, resolutionAction: action }
        : e
    );

    const decision: Decision = {
      id: uuidv4(),
      gameId: state.id,
      action: `处理事件"${event.title}": ${action}`,
      timestamp: state.currentTime,
      dataSourceIds: [event.dataSourceId, ...dataSourceIds],
      result: '事件已解决',
      markedCritical: severityToNumber(event.severity) >= 4
    };

    set({
      state: {
        ...state,
        events: updatedEvents,
        decisions: [...state.decisions, decision]
      }
    });
  },

  markDecisionCritical: (decisionId: string, isCritical: boolean) => {
    const { state } = get();
    if (!state) return;

    set({
      state: {
        ...state,
        decisions: state.decisions.map(d =>
          d.id === decisionId ? { ...d, markedCritical: isCritical } : d
        )
      }
    });
  },

  setSpeed: (speed: number) => {
    const { state } = get();
    if (!state) return;

    set({
      state: {
        ...state,
        speed
      }
    });
  },

  tick: (deltaTime: number) => {
    const { state, crowdSimulator, eventSystem, scoringEngine, availableDataSources } = get();
    if (!state || !crowdSimulator || !eventSystem || state.status !== 'running') return;

    const adjustedDelta = deltaTime * state.speed;
    const newTime = state.currentTime + adjustedDelta;

    const map = festivalMaps.find(m => m.id === state.mapId)!;
    if (newTime >= map.duration) {
      get().endGame();
      return;
    }

    let weather = state.weather;
    const weatherProgress = newTime / map.duration;
    if (weatherProgress > 0.7 && weather === 'clear') {
      weather = 'cloudy';
    } else if (weatherProgress > 0.8 && weather === 'cloudy') {
      weather = 'rain';
    } else if (weatherProgress > 0.9 && weather === 'rain') {
      weather = 'heavy_rain';
    }

    const { particles, congestionIndex, crowdDensity } = crowdSimulator.update(
      adjustedDelta,
      state.deployments,
      weather,
      newTime,
      map.duration
    );

    const patrolCoverage = crowdSimulator.calculatePatrolCoverage(state.deployments);
    const activeEvents = state.events.filter(e => !e.resolved).length;
    const riskLevel = scoringEngine.calculateRiskLevel(
      congestionIndex,
      patrolCoverage,
      activeEvents,
      weather
    );

    const context = {
      map,
      deployments: state.deployments,
      congestionIndex,
      patrolCoverage,
      weather,
      gameTime: newTime,
      totalDuration: map.duration,
      activeEvents: state.events,
      availableDataSources
    };

    let newEvents = [...state.events];
    const newEvent = eventSystem.update(context);
    if (newEvent) {
      newEvents.push(newEvent);
    }

    if (newTime > 100 && newTime < 110 && !state.events.some(e => e.title.includes('脏数据'))) {
      const dirtyEvent = eventSystem.createDirtyExitCongestionEvent(context, true);
      newEvents.push(dirtyEvent);
    }

    if (newTime > 150 && newTime < 160 && !state.events.some(e => e.type === 'patrol_gap' && e.timestamp > 140)) {
      const patrolEvent = eventSystem.createPatrolGapEvent(context);
      newEvents.push(patrolEvent);
    }

    if (newTime > 200 && newTime < 210 && !state.events.some(e => e.type === 'weather_change' && e.timestamp > 190)) {
      const weatherEvent = eventSystem.createWeatherChangeEvent(context);
      newEvents.push(weatherEvent);
    }

    const snapshot: GameSnapshot = {
      timestamp: newTime,
      congestionIndex,
      patrolCoverage,
      riskLevel,
      weather,
      crowdDensity,
      activeEvents: newEvents.filter(e => !e.resolved).length,
      deploymentCount: state.deployments.length
    };

    const shouldSaveSnapshot = state.snapshots.length === 0 || 
      newTime - state.snapshots[state.snapshots.length - 1].timestamp >= 5;

    if (shouldSaveSnapshot) {
      saveSnapshot(state.id, snapshot);
    }

    set({
      state: {
        ...state,
        currentTime: newTime,
        weather,
        crowdParticles: particles,
        congestionIndex,
        patrolCoverage,
        riskLevel,
        events: newEvents,
        snapshots: shouldSaveSnapshot 
          ? [...state.snapshots, snapshot] 
          : state.snapshots
      }
    });
  },

  getDataSourceById: (id: string) => {
    return get().availableDataSources.find(d => d.id === id);
  },

  getEventDataSource: (eventId: string) => {
    const { state, availableDataSources } = get();
    if (!state) return undefined;
    
    const event = state.events.find(e => e.id === eventId);
    if (!event) return undefined;
    
    return availableDataSources.find(d => d.id === event.dataSourceId);
  }
}));
