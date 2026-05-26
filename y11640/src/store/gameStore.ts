import { create } from 'zustand';
import type { GameStore, LevelConfig, Passenger, EmergencyEvent } from '@/types/game';

export const useGameStore = create<GameStore>((set, get) => ({
  currentLevel: null,
  passengers: [],
  gates: [],
  areas: [],
  score: 0,
  timeRemaining: 0,
  actionLogs: [],
  scoreDetails: [],
  isPaused: false,
  isGameOver: false,
  isPlaying: false,
  currentEvent: null,
  congestionZones: [],
  lineCounter: 0,
  gameStartTime: 0,

  startGame: (level: LevelConfig) => {
    const startTime = Date.now();
    set({
      currentLevel: level,
      passengers: [],
      gates: level.gates.map(g => ({ ...g })),
      areas: level.areas.map(a => ({ ...a })),
      score: 0,
      timeRemaining: level.timeLimit,
      actionLogs: [],
      scoreDetails: [],
      isPaused: false,
      isGameOver: false,
      isPlaying: true,
      currentEvent: null,
      congestionZones: [],
      lineCounter: 0,
      gameStartTime: startTime,
    });
    get().addActionLog('游戏引擎', '游戏开始', 'success', `关卡: ${level.name}`);
  },

  pauseGame: () => {
    set({ isPaused: true });
    get().addActionLog('游戏控制', '游戏暂停', 'success');
  },

  resumeGame: () => {
    set({ isPaused: false });
    get().addActionLog('游戏控制', '游戏继续', 'success');
  },

  endGame: () => {
    const state = get();
    set({ isGameOver: true, isPlaying: false });
    state.addActionLog('游戏引擎', '游戏结束', 'success', `最终得分: ${state.score}`);
  },

  resetGame: () => {
    set({
      currentLevel: null,
      passengers: [],
      gates: [],
      areas: [],
      score: 0,
      timeRemaining: 0,
      actionLogs: [],
      scoreDetails: [],
      isPaused: false,
      isGameOver: false,
      isPlaying: false,
      currentEvent: null,
      congestionZones: [],
      lineCounter: 0,
      gameStartTime: 0,
    });
  },

  toggleGate: (gateId: string) => {
    const state = get();
    const gates = state.gates.map(gate => {
      if (gate.id === gateId) {
        const newStatus: 'open' | 'closed' | 'fault' = gate.status === 'open' ? 'closed' : 'open';
        return { ...gate, status: newStatus };
      }
      return gate;
    });
    const gate = state.gates.find(g => g.id === gateId);
    if (gate) {
      const newStatus = gate.status === 'open' ? 'closed' : 'open';
      state.addActionLog('闸机控制', `切换闸机 ${gate.name} 状态: ${newStatus}`, 'success');
      state.updateScore(newStatus === 'open' ? 5 : -2, `闸机 ${gate.name} 状态变更`);
    }
    set({ gates });
  },

  toggleArea: (areaId: string) => {
    const state = get();
    const areas = state.areas.map(area => {
      if (area.id === areaId) {
        return { ...area, blocked: !area.blocked };
      }
      return area;
    });
    const area = state.areas.find(a => a.id === areaId);
    if (area) {
      const newStatus = area.blocked ? '开放' : '封闭';
      state.addActionLog('区域管理', `${newStatus}区域: ${area.name}`, 'success');
      state.updateScore(area.blocked ? 5 : -3, `区域 ${area.name} ${newStatus}`);
    }
    set({ areas });
  },

  sendBroadcast: (content: string, type: 'info' | 'warning' | 'emergency') => {
    const state = get();
    const typeNames = { info: '提示', warning: '警告', emergency: '紧急' };
    state.addActionLog('广播系统', `发送${typeNames[type]}广播: "${content}"`, 'success');
    const baseScore = type === 'emergency' ? 10 : type === 'warning' ? 5 : 2;
    state.updateScore(baseScore, `广播: ${content}`);
  },

  addPassenger: (passenger: Passenger) => {
    set(state => ({ passengers: [...state.passengers, passenger] }));
  },

  updatePassenger: (id: string, updates: Partial<Passenger>) => {
    set(state => ({
      passengers: state.passengers.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  addActionLog: (source: string, action: string, result: 'success' | 'warning' | 'error', details?: string) => {
    const state = get();
    const newLine = state.lineCounter + 1;
    const log = {
      lineNumber: newLine,
      source,
      action,
      time: Date.now() - state.gameStartTime,
      result,
      details,
    };
    set({
      actionLogs: [...state.actionLogs, log],
      lineCounter: newLine,
    });
  },

  updateScore: (delta: number, reason: string) => {
    set(state => ({ score: Math.max(0, state.score + delta) }));
  },

  triggerEmergencyEvent: (event: EmergencyEvent) => {
    const state = get();
    const updatedEvent = { ...event, triggered: true };
    set({ currentEvent: updatedEvent });
    const eventNames = {
      gate_fault: '闸机故障',
      station_close: '临时封站',
      crowd_surge: '客流激增',
    };
    state.addActionLog('事件系统', `触发紧急事件: ${eventNames[event.type]} - ${event.description}`, 'error');
    state.updateScore(-10, `紧急事件: ${eventNames[event.type]}`);
  },

  resolveEmergencyEvent: () => {
    const state = get();
    if (state.currentEvent) {
      state.addActionLog('事件系统', '紧急事件已处理', 'success');
      state.updateScore(15, '事件处理完成');
    }
    set({ currentEvent: null });
  },

  setTimeRemaining: (time: number) => {
    set({ timeRemaining: time });
  },
}));
