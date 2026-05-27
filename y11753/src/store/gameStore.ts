import { create } from 'zustand';
import {
  GameState,
  Resource,
  Fault,
  Operation,
  GameEvent,
  Level,
  WeatherType,
  FaultPriority,
  FaultType,
  RESOURCE_CONFIG,
  WEATHER_CONFIG,
  PRIORITY_CONFIG,
  FAULT_TYPE_CONFIG
} from '../types';
import { generateId, clamp } from '../utils/helpers';

interface GameStore extends GameState {
  initializeGame: (level: Level) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  setSpeed: (multiplier: number) => void;
  updateTime: (delta: number) => void;
  consumeBattery: (amount: number) => boolean;
  setWeather: (weather: WeatherType) => void;
  addFault: (fault: Omit<Fault, 'id' | 'discoveredAt' | 'deadline' | 'status'>) => void;
  updateFault: (id: string, updates: Partial<Fault>) => void;
  addOperation: (operation: Omit<Operation, 'id' | 'timestamp'>) => void;
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeEvent: (id: string) => void;
  dispatchResource: (resourceId: string, targetAreaId: string, action: 'inspect' | 'clean' | 'repair') => boolean;
  updateResource: (id: string, updates: Partial<Resource>) => void;
  updateResourceCooldowns: (delta: number) => void;
  checkFaultDeadlines: () => void;
  generateRandomFault: () => void;
  setWeatherForecast: (forecast: WeatherType[]) => void;
  updateObjective: (id: string, current: number) => void;
  completeResourceWork: (resourceId: string, targetAreaId: string, action: 'inspect' | 'clean' | 'repair') => void;
}

const createInitialResources = (): Resource[] => {
  return [
    {
      id: 'drone-1',
      type: 'drone',
      name: '无人机-1',
      status: 'available',
      cooldownTime: 0,
      totalCooldown: RESOURCE_CONFIG.drone.cooldown,
      batteryCost: RESOURCE_CONFIG.drone.batteryCost
    },
    {
      id: 'drone-2',
      type: 'drone',
      name: '无人机-2',
      status: 'available',
      cooldownTime: 0,
      totalCooldown: RESOURCE_CONFIG.drone.cooldown,
      batteryCost: RESOURCE_CONFIG.drone.batteryCost
    },
    {
      id: 'cleaner-1',
      type: 'cleaner',
      name: '清洗队-1',
      status: 'available',
      cooldownTime: 0,
      totalCooldown: RESOURCE_CONFIG.cleaner.cooldown,
      batteryCost: RESOURCE_CONFIG.cleaner.batteryCost
    },
    {
      id: 'repair-1',
      type: 'repair',
      name: '维修队-1',
      status: 'available',
      cooldownTime: 0,
      totalCooldown: RESOURCE_CONFIG.repair.cooldown,
      batteryCost: RESOURCE_CONFIG.repair.batteryCost
    }
  ];
};

const initialState: Omit<GameState, 'level'> & { level: Level | null } = {
  status: 'idle',
  level: null,
  currentTime: 0,
  totalTime: 0,
  score: 0,
  battery: 100,
  weather: 'sunny',
  weatherForecast: [],
  faults: [],
  operations: [],
  events: [],
  resources: createInitialResources(),
  objectives: [],
  speedMultiplier: 1
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  initializeGame: (level: Level) => {
    const objectives = level.objectives.map(obj => ({
      ...obj,
      current: 0,
      completed: false
    }));

    const initialFaults: Fault[] = level.initialFaults.map(f => ({
      ...f,
      id: generateId(),
      discoveredAt: 0,
      deadline: PRIORITY_CONFIG[f.priority].timeLimit,
      status: 'pending'
    }));

    set({
      ...initialState,
      level,
      totalTime: level.totalTime,
      battery: level.initialBattery,
      faults: initialFaults,
      objectives,
      status: 'idle'
    });
  },

  startGame: () => set({ status: 'playing' }),
  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),
  endGame: () => set({ status: 'finished' }),
  resetGame: () => set(initialState),
  setSpeed: (multiplier) => set({ speedMultiplier: multiplier }),

  updateTime: (delta) => {
    const state = get();
    const newTime = state.currentTime + delta;
    
    if (state.level) {
      const batteryDecay = state.level.batteryDecayRate * delta * WEATHER_CONFIG[state.weather].batteryMultiplier;
      const newBattery = clamp(state.battery - batteryDecay, 0, 100);
      
      if (newBattery < 30 && state.battery >= 30) {
        get().addEvent({
          type: 'battery_warning',
          level: 'warning',
          title: '电量警告',
          message: `当前电量已降至 ${Math.round(newBattery)}%，请合理安排任务！`
        });
      } else if (newBattery < 15 && state.battery >= 15) {
        get().addEvent({
          type: 'battery_warning',
          level: 'danger',
          title: '电量严重不足',
          message: `电量已低于15%，高耗电操作将被限制！`
        });
      }

      set({
        currentTime: newTime,
        battery: newBattery
      });

      if (newTime >= state.totalTime) {
        get().endGame();
      }
    }
  },

  consumeBattery: (amount) => {
    const state = get();
    if (state.battery < amount) return false;
    set({ battery: clamp(state.battery - amount, 0, 100) });
    return true;
  },

  setWeather: (weather) => {
    const oldWeather = get().weather;
    if (oldWeather !== weather) {
      set({ weather });
      get().addEvent({
        type: 'weather_change',
        level: weather === 'stormy' ? 'danger' : weather === 'rainy' ? 'warning' : 'info',
        title: '天气变化',
        message: `天气已从${WEATHER_CONFIG[oldWeather].name}变为${WEATHER_CONFIG[weather].name}。${WEATHER_CONFIG[weather].description}`
      });
    }
  },

  setWeatherForecast: (forecast) => set({ weatherForecast: forecast }),

  addFault: (fault) => {
    const state = get();
    if (state.faults.filter(f => f.status === 'pending' || f.status === 'processing').length >= (state.level?.maxFaults || 10)) {
      return;
    }

    const newFault: Fault = {
      ...fault,
      id: generateId(),
      discoveredAt: state.currentTime,
      deadline: state.currentTime + PRIORITY_CONFIG[fault.priority].timeLimit,
      status: 'pending'
    };

    set({ faults: [...state.faults, newFault] });

    const area = state.level?.mapLayout.find(a => a.id === fault.areaId);
    get().addEvent({
      type: 'info',
      level: fault.priority === 'critical' || fault.priority === 'high' ? 'warning' : 'info',
      title: '新故障报告',
      message: `${area?.name || '未知区域'} 发现${FAULT_TYPE_CONFIG[fault.type].name}（优先级：${PRIORITY_CONFIG[fault.priority].name}）`
    });
  },

  updateFault: (id, updates) => {
    set(state => ({
      faults: state.faults.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  },

  addOperation: (operation) => {
    const state = get();
    const newOperation: Operation = {
      ...operation,
      id: generateId(),
      timestamp: state.currentTime
    };
    set({ operations: [...state.operations, newOperation] });
  },

  addEvent: (event) => {
    const state = get();
    const newEvent: GameEvent = {
      ...event,
      id: generateId(),
      timestamp: state.currentTime,
      acknowledged: false
    };
    set({ events: [...state.events, newEvent] });
  },

  acknowledgeEvent: (id) => {
    set(state => ({
      events: state.events.map(e => e.id === id ? { ...e, acknowledged: true } : e)
    }));
  },

  dispatchResource: (resourceId, targetAreaId, action) => {
    const state = get();
    const resource = state.resources.find(r => r.id === resourceId);
    
    if (!resource || resource.status !== 'available') return false;
    
    const weatherConfig = WEATHER_CONFIG[state.weather];
    if (resource.type === 'drone' && !weatherConfig.droneAllowed) {
      get().addEvent({
        type: 'info',
        level: 'warning',
        title: '操作被拒绝',
        message: `${weatherConfig.name}天气下禁止无人机飞行！`
      });
      return false;
    }

    if (state.battery < 15 && resource.batteryCost > 5) {
      get().addEvent({
        type: 'info',
        level: 'danger',
        title: '电量不足',
        message: '电量过低，无法执行高耗电操作！'
      });
      return false;
    }

    if (!get().consumeBattery(resource.batteryCost)) {
      return false;
    }

    const workTime = RESOURCE_CONFIG[resource.type].workTime;
    
    get().updateResource(resourceId, {
      status: 'working',
      currentTarget: targetAreaId,
      workProgress: 0
    });

    get().addOperation({
      resourceId,
      resourceType: resource.type,
      targetAreaId,
      action,
      result: 'pending',
      source: '玩家操作'
    });

    const pendingFaults = state.faults.filter(
      f => f.areaId === targetAreaId && f.status === 'pending'
    );
    
    pendingFaults.forEach(fault => {
      if (action === 'repair' && (fault.type === 'inverter_fault' || fault.type === 'wire_damage')) {
        get().updateFault(fault.id, { status: 'processing', handledBy: resourceId });
      } else if (action === 'clean' && fault.type === 'panel_dirty') {
        get().updateFault(fault.id, { status: 'processing', handledBy: resourceId });
      } else if (action === 'inspect' && fault.type === 'unknown') {
        get().updateFault(fault.id, { status: 'processing', handledBy: resourceId });
      }
    });

    setTimeout(() => {
      const currentState = get();
      const currentResource = currentState.resources.find(r => r.id === resourceId);
      if (currentResource && currentResource.status === 'working') {
        get().completeResourceWork(resourceId, targetAreaId, action);
      }
    }, workTime * 1000);

    return true;
  },

  completeResourceWork: (resourceId: string, targetAreaId: string, _action: 'inspect' | 'clean' | 'repair') => {
    const state = get();
    const resource = state.resources.find(r => r.id === resourceId);
    if (!resource) return;

    const processedFaults = state.faults.filter(
      f => f.areaId === targetAreaId && f.status === 'processing' && f.handledBy === resourceId
    );

    processedFaults.forEach(fault => {
      get().updateFault(fault.id, {
        status: 'fixed',
        handledAt: state.currentTime
      });

      const isOnTime = state.currentTime <= fault.deadline;
      const points = isOnTime ? 50 : 20;
      set(s => ({ score: s.score + points }));

      const lastOp = state.operations.find(op => op.resourceId === resourceId && op.result === 'pending');
      if (lastOp) {
        set(s => ({
          operations: s.operations.map(op =>
            op.id === lastOp.id ? { ...op, result: 'success', faultId: fault.id } : op
          )
        }));
      }
    });

    if (processedFaults.length === 0) {
      const lastOp = state.operations.find(op => op.resourceId === resourceId && op.result === 'pending');
      if (lastOp) {
        set(s => ({
          operations: s.operations.map(op =>
            op.id === lastOp.id ? { ...op, result: 'success' } : op
          )
        }));
      }
    }

    get().updateResource(resourceId, {
      status: 'cooling',
      cooldownTime: resource.totalCooldown,
      currentTarget: undefined,
      workProgress: undefined
    });
  },

  updateResource: (id, updates) => {
    set(state => ({
      resources: state.resources.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  },

  updateResourceCooldowns: (delta) => {
    set(state => ({
      resources: state.resources.map(r => {
        if (r.status === 'cooling') {
          const newCooldown = Math.max(0, r.cooldownTime - delta);
          return {
            ...r,
            cooldownTime: newCooldown,
            status: newCooldown <= 0 ? 'available' : 'cooling'
          };
        }
        if (r.status === 'working' && r.workProgress !== undefined) {
          const config = RESOURCE_CONFIG[r.type];
          const newProgress = (r.workProgress || 0) + (delta / config.workTime) * 100;
          return { ...r, workProgress: Math.min(100, newProgress) };
        }
        return r;
      })
    }));
  },

  checkFaultDeadlines: () => {
    const state = get();
    state.faults.forEach(fault => {
      if (fault.status === 'pending' && state.currentTime > fault.deadline) {
        get().updateFault(fault.id, { status: 'missed' });
        set(s => ({ score: s.score - 100 }));
        
        const area = state.level?.mapLayout.find(a => a.id === fault.areaId);
        get().addEvent({
          type: 'fault_missed',
          level: 'danger',
          title: '故障漏查',
          message: `${area?.name || '未知区域'} 的${FAULT_TYPE_CONFIG[fault.type].name}未及时处理，已记录为漏查！`
        });
      }
    });
  },

  generateRandomFault: () => {
    const state = get();
    if (!state.level) return;

    const pendingCount = state.faults.filter(f => f.status === 'pending').length;
    if (pendingCount >= state.level.maxFaults) return;

    const panelAreas = state.level.mapLayout.filter(a => a.type === 'panel');
    const inverterAreas = state.level.mapLayout.filter(a => a.type === 'inverter');
    const allAreas = [...panelAreas, ...inverterAreas];
    
    if (allAreas.length === 0) return;

    const randomArea = allAreas[Math.floor(Math.random() * allAreas.length)];
    
    let faultType: FaultType;
    if (randomArea.type === 'panel') {
      faultType = Math.random() < 0.7 ? 'panel_dirty' : 'unknown';
    } else {
      faultType = Math.random() < 0.5 ? 'inverter_fault' : 'wire_damage';
    }

    const priorityRoll = Math.random();
    let priority: FaultPriority;
    if (priorityRoll < 0.1) priority = 'critical';
    else if (priorityRoll < 0.3) priority = 'high';
    else if (priorityRoll < 0.6) priority = 'medium';
    else priority = 'low';

    get().addFault({
      areaId: randomArea.id,
      type: faultType,
      priority,
      source: '传感器检测',
      description: FAULT_TYPE_CONFIG[faultType].description
    });
  },

  updateObjective: (id, current) => {
    set(state => ({
      objectives: state.objectives.map(obj =>
        obj.id === id ? { ...obj, current, completed: current >= obj.target } : obj
      )
    }));
  }
}));
