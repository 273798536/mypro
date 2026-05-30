import { create } from 'zustand';
import { GameStore, MaintenanceRecord } from '../types/game';
import { getInitialGameState } from '../data/initialState';
import { runNetworkCalculation } from '../engine/network';
import { detectConflicts, resolveConflictAndApply, applyAction } from '../engine/conflict';
import { calculateResourceChanges, naturalDecay, createRoundSnapshot } from '../engine/settlement';

const STORAGE_KEY = 'mars_water_cycle_game';

function loadFromStorage(): Partial<GameStore> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return null;
}

function saveToStorage(state: GameStore) {
  try {
    const toSave = {
      currentRound: state.currentRound,
      maxRounds: state.maxRounds,
      isGameOver: state.isGameOver,
      totalScore: state.totalScore,
      nodes: state.nodes,
      pipes: state.pipes,
      resources: state.resources,
      roundHistory: state.roundHistory,
      anomalies: state.anomalies,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

const initialState = getInitialGameState();
const storedState = loadFromStorage();

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  ...storedState,

  addAction: (record) => {
    const state = get();
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      round: state.currentRound,
      timestamp: Date.now(),
    };
    set({ currentActions: [...state.currentActions, newRecord] });
  },

  resolveConflict: (conflictId, chosenSide) => {
    const state = get();
    const conflict = state.pendingConflicts.find(c => c.id === conflictId);
    if (!conflict || conflict.resolved) return;

    const { updatedNodes, resolvedConflict } = resolveConflictAndApply(
      state.nodes,
      conflict,
      chosenSide
    );

    const updatedConflicts = state.pendingConflicts.map(c =>
      c.id === conflictId ? resolvedConflict : c
    );

    set({
      nodes: updatedNodes,
      pendingConflicts: updatedConflicts,
    });
  },

  nextRound: () => {
    const state = get();
    
    if (state.pendingConflicts.some(c => !c.resolved)) {
      alert('请先解决所有维护冲突！');
      return;
    }

    let updatedNodes = [...state.nodes];
    state.currentActions.forEach(action => {
      const hasConflict = state.pendingConflicts.some(
        c => c.nodeId === action.nodeId && c.resolved
      );
      if (!hasConflict) {
        updatedNodes = applyAction(updatedNodes, action);
      }
    });

    updatedNodes = naturalDecay(updatedNodes);

    const { updatedNodes: finalNodes, updatedPipes, anomalies } = runNetworkCalculation(
      updatedNodes,
      state.pipes
    );

    const anomaliesWithRound = anomalies.map(a => ({ ...a, round: state.currentRound }));

    const { resources: finalResources, scoreDelta } = calculateResourceChanges(
      finalNodes,
      updatedPipes,
      state.resources,
      anomaliesWithRound
    );

    const newTotalScore = state.totalScore + scoreDelta;

    const roundData = createRoundSnapshot(
      state.currentRound,
      state.currentActions,
      state.pendingConflicts,
      anomaliesWithRound,
      finalResources,
      scoreDelta,
      finalNodes,
      updatedPipes
    );

    const isGameOver = state.currentRound >= state.maxRounds;

    const newState = {
      currentRound: state.currentRound + 1,
      nodes: finalNodes,
      pipes: updatedPipes,
      resources: finalResources,
      totalScore: newTotalScore,
      roundHistory: [...state.roundHistory, roundData],
      anomalies: [...state.anomalies, ...anomaliesWithRound],
      currentActions: [],
      pendingConflicts: [],
      showSettlement: true,
      lastSettlementData: roundData,
      isGameOver,
    };

    set(newState);
    saveToStorage(get());
  },

  resetGame: () => {
    const freshState = getInitialGameState();
    set(freshState);
    localStorage.removeItem(STORAGE_KEY);
  },

  closeSettlement: () => {
    set({ showSettlement: false });
  },
}));

export function useCurrentRoundConflicts() {
  const { currentActions, nodes, pendingConflicts } = useGameStore();
  
  if (pendingConflicts.length > 0) {
    return pendingConflicts;
  }
  
  return detectConflicts(currentActions, nodes);
}
