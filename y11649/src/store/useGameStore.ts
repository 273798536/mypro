import { create } from 'zustand';
import type { GameStore, GameDifficulty, EquipmentType, WarningType, ActionRecord } from '@/types';
import {
  generateWeather,
  generateVictims,
  generatePatrollers,
  generateSlopeMap,
  getGameTimeLimit,
  getWeatherModifier,
} from '@/utils/gameUtils';
import { findShortestPath, calculateTravelTime, isPathOpen } from '@/utils/pathfinding';
import { calculateScore } from '@/utils/scoring';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const initialState = {
  status: 'idle' as const,
  difficulty: 'normal' as const,
  currentTime: 0,
  totalTime: 480,
  weather: 'sunny' as const,
  slopeMap: [],
  victims: [],
  patrollers: [],
  warnings: [],
  actionHistory: [],
  report: null,
  selectedPatroller: null,
  selectedVictim: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: (difficulty: GameDifficulty) => {
    const weather = generateWeather(difficulty);
    const victims = generateVictims(difficulty);
    const patrollers = generatePatrollers(difficulty);
    const slopeMap = generateSlopeMap(difficulty);
    const totalTime = getGameTimeLimit(difficulty);

    const action: ActionRecord = {
      id: generateId(),
      type: 'game',
      timestamp: 0,
      description: `游戏开始 - 难度: ${difficulty === 'easy' ? '简单' : difficulty === 'normal' ? '普通' : '困难'}`,
      details: { difficulty, weather },
    };

    set({
      status: 'playing',
      difficulty,
      weather,
      victims,
      patrollers,
      slopeMap,
      totalTime,
      currentTime: 0,
      warnings: [],
      actionHistory: [action],
      report: null,
      selectedPatroller: null,
      selectedVictim: null,
    });
  },

  pauseGame: () => {
    set({ status: 'paused' });
  },

  resumeGame: () => {
    set({ status: 'playing' });
  },

  restartGame: () => {
    const { difficulty } = get();
    get().startGame(difficulty);
  },

  endGame: () => {
    const { victims, warnings, actionHistory, currentTime } = get();
    const report = calculateScore(victims, warnings, actionHistory, currentTime);

    set({
      status: 'lost',
      report,
    });
  },

  selectPatroller: (id: string | null) => {
    set({ selectedPatroller: id });
  },

  selectVictim: (id: string | null) => {
    set({ selectedVictim: id });
  },

  dispatchPatroller: (patrollerId: string, victimId: string, equipment: EquipmentType[]) => {
    const state = get();
    const patroller = state.patrollers.find(p => p.id === patrollerId);
    const victim = state.victims.find(v => v.id === victimId);

    if (!patroller || !victim || patroller.status !== 'idle') return;

    const path = findShortestPath(state.slopeMap, patroller.currentLocation, victim.location);
    const weatherModifier = getWeatherModifier(state.weather);

    if (!path) {
      get().addWarning('route-closed', `无法到达 ${victim.name} 的位置`, '路径规划');
      return;
    }

    if (!isPathOpen(state.slopeMap, path)) {
      get().addWarning('route-closed', `通往 ${victim.name} 的路线已关闭`, '路径检查');
      return;
    }

    const missingEquipment = victim.requiredEquipment.filter(e => !equipment.includes(e));
    if (missingEquipment.length > 0) {
      const missingNames = missingEquipment.map(e => {
        const names: Record<string, string> = {
          stretcher: '担架', oxygen: '氧气瓶', aed: 'AED',
          'first-aid': '急救包', rope: '绳索', radio: '对讲机',
        };
        return names[e] || e;
      }).join('、');
      get().addWarning(
        'equipment-mismatch',
        `救援 ${victim.name} 缺少装备: ${missingNames}`,
        '装备检查'
      );
    }

    const travelTime = calculateTravelTime(state.slopeMap, path, weatherModifier);

    const dispatchAction: ActionRecord = {
      id: generateId(),
      type: 'dispatch',
      timestamp: state.currentTime,
      description: `派遣 ${patroller.name} 救援 ${victim.name}`,
      details: { patroller: patroller.name, victim: victim.name, equipment, travelTime },
    };

    const equipAction: ActionRecord = {
      id: generateId(),
      type: 'equip',
      timestamp: state.currentTime,
      description: `为 ${patroller.name} 配备装备`,
      details: { equipment, correct: missingEquipment.length === 0, missingEquipment },
    };

    set(state => ({
      patrollers: state.patrollers.map(p =>
        p.id === patrollerId
          ? { ...p, status: 'en-route' as const, targetLocation: victim.location, equipment, assignedVictim: victimId, progress: 0 }
          : p
      ),
      actionHistory: [...state.actionHistory, dispatchAction, equipAction],
      selectedPatroller: null,
      selectedVictim: null,
    }));
  },

  addWarning: (type: WarningType, message: string, source?: string) => {
    const state = get();
    const warning = {
      id: generateId(),
      type,
      message,
      timestamp: state.currentTime,
      isResolved: false,
      source,
    };

    const action: ActionRecord = {
      id: generateId(),
      type: 'warning',
      timestamp: state.currentTime,
      description: `警告: ${message}`,
      details: { type, source },
    };

    set(state => ({
      warnings: [...state.warnings, warning],
      actionHistory: [...state.actionHistory, action],
    }));
  },

  resolveWarning: (warningId: string, correction?: string) => {
    const state = get();
    const warning = state.warnings.find(w => w.id === warningId);
    if (!warning) return;

    const action: ActionRecord = {
      id: generateId(),
      type: 'correction',
      timestamp: state.currentTime,
      description: `修正警告: ${warning.message}`,
      details: { warningId, correction },
    };

    set(state => ({
      warnings: state.warnings.map(w =>
        w.id === warningId
          ? { ...w, isResolved: true, resolvedAt: state.currentTime, correction }
          : w
      ),
      actionHistory: [...state.actionHistory, action],
    }));
  },

  updateTimer: () => {
    const state = get();
    if (state.status !== 'playing') return;

    const newTime = state.currentTime + 1;

    let updatedVictims = [...state.victims];
    let updatedPatrollers = [...state.patrollers];
    const newWarnings = [...state.warnings];
    const newActions = [...state.actionHistory];

    const weatherModifier = getWeatherModifier(state.weather);

    updatedPatrollers = updatedPatrollers.map(patroller => {
      if (patroller.status === 'en-route' && patroller.assignedVictim) {
        const victim = updatedVictims.find(v => v.id === patroller.assignedVictim);
        if (!victim) return patroller;

        const path = findShortestPath(state.slopeMap, patroller.currentLocation, victim.location);
        if (!path) return patroller;

        const travelTime = calculateTravelTime(state.slopeMap, path, weatherModifier);
        const newProgress = patroller.progress + (1 / travelTime) * 100;

        if (newProgress >= 100) {
          const hasAllEquipment = victim.requiredEquipment.every(e => patroller.equipment.includes(e));

          if (hasAllEquipment) {
            updatedVictims = updatedVictims.map(v =>
              v.id === victim.id ? { ...v, isRescued: true } : v
            );

            const rescueAction: ActionRecord = {
              id: generateId(),
              type: 'rescue',
              timestamp: newTime,
              description: `成功救援 ${victim.name}`,
              details: { victim: victim.name, patroller: patroller.name },
            };
            newActions.push(rescueAction);

            return { ...patroller, status: 'returning' as const, progress: 0, targetLocation: 'base' };
          } else {
            return { ...patroller, status: 'idle' as const, targetLocation: null, assignedVictim: null, progress: 0 };
          }
        }

        return { ...patroller, progress: newProgress };
      }

      if (patroller.status === 'returning') {
        const path = findShortestPath(state.slopeMap, patroller.currentLocation, 'base');
        if (!path) return { ...patroller, status: 'idle' as const, targetLocation: null, assignedVictim: null, progress: 0 };

        const travelTime = calculateTravelTime(state.slopeMap, path, weatherModifier);
        const newProgress = patroller.progress + (1 / travelTime) * 100;

        if (newProgress >= 100) {
          return { ...patroller, status: 'idle' as const, currentLocation: 'base', targetLocation: null, assignedVictim: null, progress: 0, equipment: [] };
        }

        return { ...patroller, progress: newProgress };
      }

      return patroller;
    });

    updatedVictims = updatedVictims.map(victim => {
      if (victim.isRescued || victim.isFailed) return victim;

      const assignedPatroller = updatedPatrollers.find(p => p.assignedVictim === victim.id);
      if (assignedPatroller) return victim;

      const newTimeRemaining = victim.timeRemaining - 1;

      if (newTimeRemaining <= victim.initialTime * 0.3 && newTimeRemaining > 0) {
        const existingWarning = newWarnings.find(
          w => w.type === 'injury-worsening' && w.message.includes(victim.name) && !w.isResolved
        );
        if (!existingWarning) {
          const warning = {
            id: generateId(),
            type: 'injury-worsening' as const,
            message: `${victim.name} 伤情正在恶化！`,
            timestamp: newTime,
            isResolved: false,
            source: '伤情监测',
          };
          newWarnings.push(warning);

          const action: ActionRecord = {
            id: generateId(),
            type: 'warning',
            timestamp: newTime,
            description: `警告: ${victim.name} 伤情恶化`,
            details: { victim: victim.name, type: 'injury-worsening' },
          };
          newActions.push(action);
        }
      }

      if (newTimeRemaining <= 0) {
        const failAction: ActionRecord = {
          id: generateId(),
          type: 'rescue',
          timestamp: newTime,
          description: `救援失败: ${victim.name} 时间耗尽`,
          details: { victim: victim.name, failed: true },
        };
        newActions.push(failAction);

        return { ...victim, timeRemaining: 0, isFailed: true };
      }

      return { ...victim, timeRemaining: newTimeRemaining };
    });

    const allVictimsProcessed = updatedVictims.every(v => v.isRescued || v.isFailed);
    const allPatrollersIdle = updatedPatrollers.every(p => p.status === 'idle');

    if (allVictimsProcessed && allPatrollersIdle) {
      const report = calculateScore(updatedVictims, newWarnings, newActions, newTime);
      const won = updatedVictims.filter(v => v.isRescued).length >= Math.ceil(updatedVictims.length * 0.5);

      set({
        status: won ? 'won' : 'lost',
        currentTime: newTime,
        victims: updatedVictims,
        patrollers: updatedPatrollers,
        warnings: newWarnings,
        actionHistory: newActions,
        report,
      });
      return;
    }

    if (newTime >= state.totalTime) {
      const report = calculateScore(updatedVictims, newWarnings, newActions, newTime);
      set({
        status: 'lost',
        currentTime: newTime,
        victims: updatedVictims,
        patrollers: updatedPatrollers,
        warnings: newWarnings,
        actionHistory: newActions,
        report,
      });
      return;
    }

    set({
      currentTime: newTime,
      victims: updatedVictims,
      patrollers: updatedPatrollers,
      warnings: newWarnings,
      actionHistory: newActions,
    });
  },

  generateReport: () => {
    const state = get();
    const report = calculateScore(state.victims, state.warnings, state.actionHistory, state.currentTime);
    set({ report });
  },

  resetGame: () => {
    set(initialState);
  },
}));
