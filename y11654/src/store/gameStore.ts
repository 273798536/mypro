import { create } from 'zustand';
import {
  GameStatus,
  Difficulty,
  RiskType,
  RiskSeverity,
  CommandType,
  CraneState,
  EnvironmentState,
  RiskState,
  ActionRecord,
  RoundData,
  GameSession,
  DIFFICULTY_CONFIG,
  RISK_INFO,
} from '../types/game';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface GameStore {
  status: GameStatus;
  difficulty: Difficulty;
  score: number;
  currentRound: number;
  roundTimeRemaining: number;
  
  crane: CraneState;
  environment: EnvironmentState;
  activeRisks: RiskState[];
  
  currentSession: GameSession | null;
  currentRoundData: RoundData | null;
  actions: ActionRecord[];
  
  history: GameSession[];
  
  intruderPosition: number;
  showIntruder: boolean;
  
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: (success: boolean, reason?: string) => void;
  
  executeCommand: (command: CommandType) => void;
  triggerRisk: (riskType: RiskType) => void;
  resolveRisk: (riskId: string, handledCorrectly: boolean) => void;
  
  updateEnvironment: () => void;
  updateCraneState: (updates: Partial<CraneState>) => void;
  updateRoundTime: (delta: number) => void;
  
  nextRound: () => void;
  generateNewRoundParams: () => void;
  
  setIntruderPosition: (pos: number) => void;
  setShowIntruder: (show: boolean) => void;
  
  loadHistory: () => void;
  saveSessionToHistory: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'idle',
  difficulty: 'normal',
  score: 0,
  currentRound: 1,
  roundTimeRemaining: 45,
  
  crane: {
    loadWeight: 500,
    maxLoad: 800,
    armAngle: 0,
    hookHeight: 2,
    isLifting: false,
    isMoving: false,
    targetPosition: 0,
  },
  
  environment: {
    windSpeed: 5,
    windDirection: 45,
    safeWindSpeed: 10,
  },
  
  activeRisks: [],
  currentSession: null,
  currentRoundData: null,
  actions: [],
  
  history: [],
  
  intruderPosition: -10,
  showIntruder: false,
  
  startGame: (difficulty: Difficulty) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const sessionId = generateId();
    const startTime = Date.now();
    
    const newSession: GameSession = {
      id: sessionId,
      startTime,
      difficulty,
      finalScore: 0,
      success: false,
      rounds: [],
      totalRounds: config.maxRounds,
      completedRounds: 0,
    };
    
    const newRound: RoundData = {
      id: generateId(),
      roundNumber: 1,
      loadWeight: 0,
      initialWindSpeed: 0,
      completed: false,
      success: false,
      risks: [],
      actions: [],
    };
    
    const loadWeight = Math.random() * (config.baseMaxLoad * 1.3) + config.baseMaxLoad * 0.3;
    const initialWindSpeed = Math.random() * (config.baseSafeWindSpeed * 1.3) + 2;
    
    set({
      status: 'playing',
      difficulty,
      score: 0,
      currentRound: 1,
      roundTimeRemaining: config.timeLimitPerRound,
      crane: {
        loadWeight,
        maxLoad: config.baseMaxLoad,
        armAngle: 0,
        hookHeight: 2,
        isLifting: false,
        isMoving: false,
        targetPosition: 0,
      },
      environment: {
        windSpeed: initialWindSpeed,
        windDirection: Math.random() * 360,
        safeWindSpeed: config.baseSafeWindSpeed,
      },
      activeRisks: [],
      currentSession: newSession,
      currentRoundData: {
        ...newRound,
        loadWeight,
        initialWindSpeed,
      },
      actions: [],
      showIntruder: false,
      intruderPosition: -10,
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
  
  endGame: (success: boolean, reason?: string) => {
    const { currentSession, score, saveSessionToHistory } = get();
    
    if (currentSession) {
      const updatedSession: GameSession = {
        ...currentSession,
        endTime: Date.now(),
        finalScore: score,
        success,
        failReason: reason,
      };
      
      set({
        status: success ? 'ended' : 'failed',
        currentSession: updatedSession,
      });
      
      saveSessionToHistory();
    } else {
      set({ status: success ? 'ended' : 'failed' });
    }
  },
  
  executeCommand: (command: CommandType) => {
    const state = get();
    if (state.status !== 'playing') return;
    
    const timestamp = Date.now();
    let scoreChange = 0;
    let reason = '';
    
    const activeRisk = state.activeRisks.find(r => !r.resolved);
    
    if (activeRisk) {
      const riskInfo = RISK_INFO[activeRisk.type];
      const responseTime = (timestamp - activeRisk.triggeredAt) / 1000;
      
      if (command === riskInfo.correctResponse) {
        scoreChange = riskInfo.bonus;
        if (responseTime < 3) {
          scoreChange += 20;
          reason = `正确应对${riskInfo.name}，响应迅速奖励`;
        } else {
          reason = `正确应对${riskInfo.name}`;
        }
        get().resolveRisk(activeRisk.id, true);
      } else {
        scoreChange = -riskInfo.penalty;
        reason = `错误应对${riskInfo.name}，应使用${riskInfo.correctResponse}`;
        get().resolveRisk(activeRisk.id, false);
        
        if (activeRisk.severity === 'danger') {
          setTimeout(() => {
            get().endGame(false, reason);
          }, 100);
          return;
        }
      }
    } else {
      switch (command) {
        case 'lift':
          if (state.crane.loadWeight > state.crane.maxLoad) {
            scoreChange = -50;
            reason = '超重起吊违规';
            setTimeout(() => {
              get().endGame(false, reason);
            }, 100);
            return;
          }
          if (state.environment.windSpeed > state.environment.safeWindSpeed) {
            scoreChange = -40;
            reason = '风速超限情况下起吊';
            setTimeout(() => {
              get().endGame(false, reason);
            }, 100);
            return;
          }
          scoreChange = 10;
          reason = '正常起吊';
          set(state => ({
            crane: { ...state.crane, isLifting: true },
          }));
          break;
          
        case 'lower':
          scoreChange = 5;
          reason = '下放吊物';
          set(state => ({
            crane: { ...state.crane, isLifting: false, hookHeight: Math.max(0.5, state.crane.hookHeight - 0.5) },
          }));
          break;
          
        case 'stop':
          scoreChange = 0;
          reason = '暂停操作';
          set(state => ({
            crane: { ...state.crane, isLifting: false, isMoving: false },
          }));
          break;
          
        case 'move_left':
        case 'move_right':
          scoreChange = 5;
          reason = command === 'move_left' ? '左移吊臂' : '右移吊臂';
          set(state => ({
            crane: { 
              ...state.crane, 
              isMoving: true,
              armAngle: state.crane.armAngle + (command === 'move_left' ? -10 : 10),
            },
          }));
          break;
          
        case 'emergency_stop':
          scoreChange = -10;
          reason = '无风险情况下使用紧急停止';
          set(state => ({
            crane: { ...state.crane, isLifting: false, isMoving: false },
          }));
          break;
          
        case 'confirm_safe':
          if (state.crane.loadWeight <= state.crane.maxLoad && 
              state.environment.windSpeed <= state.environment.safeWindSpeed) {
            scoreChange = 20;
            reason = '正确确认安全状态';
            get().nextRound();
          } else {
            scoreChange = -30;
            reason = '错误确认安全 - 实际存在风险';
          }
          break;
          
        case 'reject_lift':
          if (state.crane.loadWeight > state.crane.maxLoad) {
            scoreChange = 50;
            reason = '正确拒绝超重吊装';
            get().nextRound();
          } else {
            scoreChange = -20;
            reason = '不必要地拒绝起吊';
          }
          break;
      }
    }
    
    const record: ActionRecord = {
      id: generateId(),
      timestamp,
      command,
      scoreChange,
      reason,
      roundNumber: state.currentRound,
    };
    
    set(state => ({
      score: Math.max(0, state.score + scoreChange),
      actions: [...state.actions, record],
      currentRoundData: state.currentRoundData ? {
        ...state.currentRoundData,
        actions: [...state.currentRoundData.actions, record],
      } : null,
    }));
  },
  
  triggerRisk: (riskType: RiskType) => {
    const state = get();
    if (state.status !== 'playing') return;
    if (state.activeRisks.some(r => r.type === riskType && !r.resolved)) return;
    
    const risk: RiskState = {
      id: generateId(),
      type: riskType,
      severity: 'danger',
      triggeredAt: Date.now(),
      resolved: false,
    };
    
    if (riskType === 'intrusion') {
      set({ showIntruder: true, intruderPosition: -8 });
    }
    
    set(state => ({
      activeRisks: [...state.activeRisks, risk],
      currentRoundData: state.currentRoundData ? {
        ...state.currentRoundData,
        risks: [...state.currentRoundData.risks, risk],
      } : null,
    }));
    
    setTimeout(() => {
      const currentState = get();
      const unresolvedRisk = currentState.activeRisks.find(r => r.id === risk.id && !r.resolved);
      if (unresolvedRisk) {
        const record: ActionRecord = {
          id: generateId(),
          timestamp: Date.now(),
          command: 'stop',
          scoreChange: -20,
          reason: `${RISK_INFO[riskType].name}响应超时`,
          roundNumber: currentState.currentRound,
        };
        set(state => ({
          score: Math.max(0, state.score - 20),
          actions: [...state.actions, record],
        }));
        get().resolveRisk(risk.id, false);
      }
    }, 5000);
  },
  
  resolveRisk: (riskId: string, handledCorrectly: boolean) => {
    const now = Date.now();
    set(state => ({
      activeRisks: state.activeRisks.map(r => 
        r.id === riskId 
          ? { 
              ...r, 
              resolved: true, 
              resolvedAt: now,
              responseTime: (now - r.triggeredAt) / 1000,
              handledCorrectly 
            }
          : r
      ),
      showIntruder: false,
    }));
  },
  
  updateEnvironment: () => {
    const state = get();
    if (state.status !== 'playing') return;
    
    const windChange = (Math.random() - 0.5) * 2;
    const newWindSpeed = Math.max(1, Math.min(20, state.environment.windSpeed + windChange));
    
    set(state => ({
      environment: {
        ...state.environment,
        windSpeed: newWindSpeed,
        windDirection: (state.environment.windDirection + (Math.random() - 0.5) * 5 + 360) % 360,
      },
    }));
    
    const config = DIFFICULTY_CONFIG[state.difficulty];
    
    if (newWindSpeed > state.environment.safeWindSpeed * 1.1) {
      if (!state.activeRisks.some(r => r.type === 'wind' && !r.resolved)) {
        get().triggerRisk('wind');
      }
    }
    
    if (Math.random() < config.riskProbability * 0.01) {
      if (!state.activeRisks.some(r => r.type === 'intrusion' && !r.resolved)) {
        get().triggerRisk('intrusion');
      }
    }
  },
  
  updateCraneState: (updates: Partial<CraneState>) => {
    set(state => ({
      crane: { ...state.crane, ...updates },
    }));
  },
  
  updateRoundTime: (delta: number) => {
    const state = get();
    if (state.status !== 'playing') return;
    
    const newTime = state.roundTimeRemaining - delta;
    
    if (newTime <= 0) {
      const record: ActionRecord = {
        id: generateId(),
        timestamp: Date.now(),
        command: 'stop',
        scoreChange: -15,
        reason: '回合超时',
        roundNumber: state.currentRound,
      };
      set(state => ({
        score: Math.max(0, state.score - 15),
        actions: [...state.actions, record],
      }));
      get().nextRound();
    } else {
      set({ roundTimeRemaining: newTime });
    }
  },
  
  nextRound: () => {
    const state = get();
    const config = DIFFICULTY_CONFIG[state.difficulty];
    
    const completedRound = state.currentRoundData;
    if (completedRound) {
      set(state => ({
        currentSession: state.currentSession ? {
          ...state.currentSession,
          rounds: [...state.currentSession.rounds, { ...completedRound, completed: true, success: true }],
          completedRounds: state.currentSession.completedRounds + 1,
        } : null,
      }));
    }
    
    if (state.currentRound >= config.maxRounds) {
      get().endGame(true, '所有回合完成');
      return;
    }
    
    const loadWeight = Math.random() * (config.baseMaxLoad * 1.4) + config.baseMaxLoad * 0.2;
    const initialWindSpeed = Math.random() * (config.baseSafeWindSpeed * 1.4) + 2;
    
    const newRound: RoundData = {
      id: generateId(),
      roundNumber: state.currentRound + 1,
      loadWeight,
      initialWindSpeed,
      completed: false,
      success: false,
      risks: [],
      actions: [],
    };
    
    set(state => ({
      currentRound: state.currentRound + 1,
      roundTimeRemaining: config.timeLimitPerRound,
      crane: {
        ...state.crane,
        loadWeight,
        maxLoad: config.baseMaxLoad,
        armAngle: 0,
        hookHeight: 2,
        isLifting: false,
        isMoving: false,
      },
      environment: {
        windSpeed: initialWindSpeed,
        windDirection: Math.random() * 360,
        safeWindSpeed: config.baseSafeWindSpeed,
      },
      activeRisks: [],
      currentRoundData: newRound,
      showIntruder: false,
      intruderPosition: -10,
    }));
  },
  
  generateNewRoundParams: () => {
    const { difficulty } = get();
    const config = DIFFICULTY_CONFIG[difficulty];
    
    const loadWeight = Math.random() * (config.baseMaxLoad * 1.3) + config.baseMaxLoad * 0.3;
    const initialWindSpeed = Math.random() * (config.baseSafeWindSpeed * 1.3) + 2;
    
    set(state => ({
      crane: { ...state.crane, loadWeight },
      environment: { ...state.environment, windSpeed: initialWindSpeed },
    }));
  },
  
  setIntruderPosition: (pos: number) => {
    set({ intruderPosition: pos });
  },
  
  setShowIntruder: (show: boolean) => {
    set({ showIntruder: show });
  },
  
  loadHistory: () => {
    try {
      const saved = localStorage.getItem('crane_game_history');
      if (saved) {
        set({ history: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  },
  
  saveSessionToHistory: () => {
    const { currentSession, history } = get();
    if (!currentSession) return;
    
    const newHistory = [currentSession, ...history].slice(0, 50);
    
    try {
      localStorage.setItem('crane_game_history', JSON.stringify(newHistory));
      set({ history: newHistory });
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  },
}));
