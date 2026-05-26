import { create } from 'zustand';
import { GameState, ExitType, ConveyorBelt, ActionRecord, GameRecord } from '../types';
import { LEVELS } from '../data/levels';
import { generateBaggage, resetBaggageCounter, determineCorrectExit } from '../utils/baggageGenerator';
import { calculateScore, createActionRecord, calculateAccuracy, calculateStarRating } from '../utils/scoring';
import { addGameRecord, saveBestScore, loadStorageState, clearAllStorage, getGameRecordById } from '../utils/storage';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/export';

const initialConveyorBelts: ConveyorBelt[] = [
  { id: 1, name: '1号传送带', targetExit: 'gate_A', isActive: true, speed: 1 },
  { id: 2, name: '2号传送带', targetExit: 'gate_B', isActive: true, speed: 1 },
  { id: 3, name: '3号传送带', targetExit: 'gate_C', isActive: true, speed: 1 },
  { id: 4, name: '4号传送带', targetExit: 'gate_D', isActive: true, speed: 1 },
];

const getInitialState = (): Omit<GameState, 
  | 'setPage' 
  | 'startGame' 
  | 'pauseGame' 
  | 'resumeGame' 
  | 'endGame' 
  | 'assignBaggage' 
  | 'switchConveyor' 
  | 'spawnBaggage'
  | 'updateBaggagePositions'
  | 'dismissError'
  | 'clearHistory'
  | 'exportReport'
  | 'startReplay'
  | 'updateReplayTime'
  | 'loadFromStorage'
> => ({
  currentPage: 'home',
  gameStatus: 'idle',
  currentLevel: null,
  currentRecordId: null,
  
  timeRemaining: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  currentBaggage: [],
  conveyorBelts: [...initialConveyorBelts],
  actions: [],
  currentErrors: [],
  activeError: null,
  
  gameHistory: [],
  bestScores: {},
  unlockedLevels: [1],
  
  isReplaying: false,
  replayData: null,
  replayTime: 0,
  replayActions: [],
});

export const useGameStore = create<GameState>((set, get) => ({
  ...getInitialState(),
  
  loadFromStorage: () => {
    const storageState = loadStorageState();
    set(storageState);
  },
  
  setPage: (page) => set({ currentPage: page }),
  
  startGame: (levelId) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    
    resetBaggageCounter();
    
    set({
      currentPage: 'game',
      gameStatus: 'playing',
      currentLevel: level,
      currentRecordId: null,
      timeRemaining: level.duration,
      score: 0,
      combo: 0,
      maxCombo: 0,
      currentBaggage: [],
      conveyorBelts: initialConveyorBelts.map(b => ({ ...b })),
      actions: [],
      currentErrors: [],
      activeError: null,
      isReplaying: false,
      replayData: null,
    });
  },
  
  pauseGame: () => set({ gameStatus: 'paused' }),
  
  resumeGame: () => set({ gameStatus: 'playing' }),
  
  endGame: () => {
    const state = get();
    if (!state.currentLevel) return;
    
    const correctCount = state.actions.filter(a => a.errorType === 'none').length;
    const accuracy = calculateAccuracy(correctCount, state.actions.length);
    const starRating = calculateStarRating(accuracy);
    const avgResponseTime = state.actions.length > 0
      ? Math.round(state.actions.reduce((sum, a) => sum + a.responseTime, 0) / state.actions.length)
      : 0;
    
    const record: GameRecord = {
      id: `record_${Date.now()}`,
      levelId: state.currentLevel.id,
      levelName: state.currentLevel.name,
      startTime: state.actions.length > 0 ? state.actions[0].timestamp : Date.now(),
      endTime: Date.now(),
      totalScore: state.score,
      accuracy,
      totalBaggage: state.actions.length,
      correctCount,
      errorCount: state.currentErrors.length,
      maxCombo: state.maxCombo,
      avgResponseTime,
      actions: [...state.actions],
      errors: [...state.currentErrors],
      starRating,
    };
    
    addGameRecord(record);
    saveBestScore(state.currentLevel.id, state.score);
    
    const newHistory = [record, ...state.gameHistory];
    
    set({
      gameStatus: 'finished',
      currentPage: 'result',
      currentRecordId: record.id,
      gameHistory: newHistory,
    });
  },
  
  spawnBaggage: () => {
    const state = get();
    if (!state.currentLevel || state.gameStatus !== 'playing') return;
    
    const totalSpawned = state.actions.length + state.currentBaggage.length;
    if (totalSpawned >= state.currentLevel.baggageCount) return;
    
    const baggage = generateBaggage(state.currentLevel);
    set({
      currentBaggage: [...state.currentBaggage, baggage],
    });
  },
  
  updateBaggagePositions: (deltaTime) => {
    const state = get();
    if (state.gameStatus !== 'playing') return;
    
    const updatedBaggage = state.currentBaggage
      .map(b => ({
        ...b,
        position: b.position + (deltaTime / 1000) * 20,
        status: b.status === 'waiting' ? 'moving' : b.status,
      }))
      .filter(b => {
        if (b.position >= 100 && b.selectedBelt !== null) {
          const belt = state.conveyorBelts.find(c => c.id === b.selectedBelt);
          if (belt && belt.targetExit) {
            get().assignBaggage(b.id, belt.targetExit);
          }
          return false;
        }
        return b.position < 120;
      });
    
    set({ currentBaggage: updatedBaggage });
  },
  
  assignBaggage: (baggageId, exitType) => {
    const state = get();
    const baggage = state.currentBaggage.find(b => b.id === baggageId);
    if (!baggage) return;
    
    const responseTime = Date.now() - baggage.generatedAt;
    const result = calculateScore(baggage, exitType, responseTime, state.combo);
    
    const actionRecord = createActionRecord(
      baggage,
      exitType,
      result.score,
      result.errorType,
      result.correctExit,
      baggage.generatedAt
    );
    
    const newCombo = result.errorType === 'none' ? state.combo + 1 : 0;
    const newMaxCombo = Math.max(state.maxCombo, newCombo);
    
    const updatedBaggage = state.currentBaggage.filter(b => b.id !== baggageId);
    
    set({
      score: Math.max(0, state.score + result.score),
      combo: newCombo,
      maxCombo: newMaxCombo,
      currentBaggage: updatedBaggage,
      actions: [...state.actions, actionRecord],
      currentErrors: result.errorType !== 'none' 
        ? [...state.currentErrors, actionRecord]
        : state.currentErrors,
      activeError: result.errorType !== 'none' ? actionRecord : state.activeError,
    });
    
    if (result.errorType !== 'none') {
      setTimeout(() => {
        get().dismissError();
      }, 3000);
    }
  },
  
  switchConveyor: (beltId, target) => {
    set(state => ({
      conveyorBelts: state.conveyorBelts.map(b =>
        b.id === beltId ? { ...b, targetExit: target } : b
      ),
    }));
  },
  
  dismissError: () => set({ activeError: null }),
  
  clearHistory: () => {
    clearAllStorage();
    set({
      gameHistory: [],
      bestScores: {},
      unlockedLevels: [1],
    });
  },
  
  exportReport: (recordId, format) => {
    const record = getGameRecordById(recordId);
    if (!record) return;
    
    if (format === 'csv') {
      exportToCSV(record);
    } else if (format === 'pdf') {
      exportToPDF(record);
    } else {
      exportToExcel(record);
    }
  },
  
  startReplay: (recordId) => {
    const record = getGameRecordById(recordId);
    if (!record) return;
    
    set({
      currentPage: 'replay',
      isReplaying: true,
      replayData: record,
      replayTime: 0,
      replayActions: [],
    });
  },
  
  updateReplayTime: (time) => {
    const state = get();
    if (!state.replayData) return;
    
    const actionsUpToTime = state.replayData.actions.filter(a => 
      a.timestamp - state.replayData!.startTime <= time
    );
    
    set({
      replayTime: time,
      replayActions: actionsUpToTime,
    });
  },
}));
