import { create } from 'zustand';
import {
  GameState,
  Level,
  Chemical,
  Shelf,
  ShelfSlot,
  RiskEvent,
  OperationLog,
  GameHistory
} from '../types';
import { RiskEngine } from '../engine/RiskEngine';
import { ScoringEngine } from '../engine/ScoringEngine';
import { storage, generateId } from '../utils/storage';
import chemicalsData from '../data/chemicals.json';
import levelsData from '../data/levels.json';

const chemicals: Chemical[] = chemicalsData as Chemical[];
const levels: Level[] = levelsData as Level[];

interface GameStore {
  currentGame: GameState | null;
  levels: Level[];
  chemicals: Chemical[];
  riskEngine: RiskEngine | null;
  histories: GameHistory[];

  loadData: () => void;
  startGame: (levelId: string) => void;
  resumeGame: () => boolean;
  placeChemical: (chemicalId: string, slotId: string) => boolean;
  removeChemical: (slotId: string) => boolean;
  swapChemical: (fromSlotId: string, toSlotId: string) => boolean;
  undoLastOperation: () => boolean;
  completeGame: () => GameHistory | null;
  pauseGame: () => void;
  resumeFromPause: () => void;
  resetGame: () => void;
  getChemicalById: (id: string) => Chemical | undefined;
  getSlotById: (slotId: string) => ShelfSlot | undefined;
  getCurrentRisks: () => RiskEvent[];
  getLevelById: (levelId: string) => Level | undefined;
  getHistories: () => GameHistory[];
  deleteHistory: (id: string) => void;
  clearHistories: () => void;
  getHistoryById: (id: string) => GameHistory | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentGame: null,
  levels: [],
  chemicals: [],
  riskEngine: null,
  histories: [],

  loadData: () => {
    set({ chemicals, levels, histories: storage.getHistories() });
  },

  startGame: (levelId: string) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    const shelfCopy: Shelf = JSON.parse(JSON.stringify(level.shelf));
    const gameId = generateId();
    const maxScore = ScoringEngine.getMaxPossibleScore(level.requiredPlacements);

    const riskEngine = new RiskEngine(chemicals, shelfCopy);

    const newGame: GameState = {
      id: gameId,
      levelId: level.id,
      startTime: Date.now(),
      currentScore: 0,
      maxPossibleScore: maxScore,
      shelf: shelfCopy,
      remainingChemicals: [...level.availableChemicals],
      operationLogs: [],
      riskEvents: [],
      isCompleted: false,
      isPaused: false
    };

    set({ currentGame: newGame, riskEngine });
    storage.saveGameState(newGame);
  },

  resumeGame: (): boolean => {
    const saved = storage.loadGameState();
    if (!saved || saved.isCompleted) return false;

    const riskEngine = new RiskEngine(chemicals, saved.shelf);
    set({ currentGame: saved, riskEngine });
    return true;
  },

  placeChemical: (chemicalId: string, slotId: string): boolean => {
    const state = get();
    const game = state.currentGame;
    const engine = state.riskEngine;
    
    if (!game || !engine || game.isCompleted || game.isPaused) return false;
    if (!game.remainingChemicals.includes(chemicalId)) return false;

    const slot = game.shelf.slots.find(s => s.id === slotId);
    if (!slot || slot.chemicalId) return false;

    const chemical = chemicals.find(c => c.id === chemicalId);
    if (!chemical) return false;

    slot.chemicalId = chemicalId;
    engine.updateShelf(game.shelf);

    const risks = engine.checkSlotRisks(slot);
    const { score: scoreChange } = ScoringEngine.calculatePlacementScore(chemical, slot, risks);

    const log: OperationLog = {
      id: generateId(),
      type: 'place',
      chemicalId,
      chemicalName: chemical.name,
      toSlotId: slotId,
      toSlotPosition: `(${slot.row + 1}行, ${slot.col + 1}列)`,
      timestamp: Date.now(),
      scoreChange,
      risks
    };

    const newRemaining = game.remainingChemicals.filter(c => c !== chemicalId);
    const newScore = game.currentScore + scoreChange;
    const newRisks = [...game.riskEvents, ...risks];

    const updatedGame: GameState = {
      ...game,
      currentScore: newScore,
      shelf: game.shelf,
      remainingChemicals: newRemaining,
      operationLogs: [...game.operationLogs, log],
      riskEvents: newRisks
    };

    set({ currentGame: updatedGame });
    storage.saveGameState(updatedGame);
    return true;
  },

  removeChemical: (slotId: string): boolean => {
    const state = get();
    const game = state.currentGame;
    const engine = state.riskEngine;
    
    if (!game || !engine || game.isCompleted || game.isPaused) return false;

    const slot = game.shelf.slots.find(s => s.id === slotId);
    if (!slot || !slot.chemicalId) return false;

    const chemicalId = slot.chemicalId;
    const chemical = chemicals.find(c => c.id === chemicalId);
    slot.chemicalId = null;
    engine.updateShelf(game.shelf);

    const allRisks = engine.checkAllRisks();

    const log: OperationLog = {
      id: generateId(),
      type: 'remove',
      chemicalId,
      chemicalName: chemical?.name,
      fromSlotId: slotId,
      toSlotId: slotId,
      timestamp: Date.now(),
      scoreChange: 0,
      risks: []
    };

    const updatedGame: GameState = {
      ...game,
      shelf: game.shelf,
      remainingChemicals: [...game.remainingChemicals, chemicalId],
      operationLogs: [...game.operationLogs, log],
      riskEvents: allRisks
    };

    set({ currentGame: updatedGame });
    storage.saveGameState(updatedGame);
    return true;
  },

  swapChemical: (fromSlotId: string, toSlotId: string): boolean => {
    const state = get();
    const game = state.currentGame;
    const engine = state.riskEngine;
    
    if (!game || !engine || game.isCompleted || game.isPaused) return false;

    const fromSlot = game.shelf.slots.find(s => s.id === fromSlotId);
    const toSlot = game.shelf.slots.find(s => s.id === toSlotId);
    
    if (!fromSlot || !toSlot) return false;
    if (!fromSlot.chemicalId) return false;

    const chemicalId = fromSlot.chemicalId;
    const chemical = chemicals.find(c => c.id === chemicalId);
    if (!chemical) return false;

    fromSlot.chemicalId = toSlot.chemicalId;
    toSlot.chemicalId = chemicalId;
    engine.updateShelf(game.shelf);

    const risks = [...engine.checkSlotRisks(fromSlot), ...engine.checkSlotRisks(toSlot)];

    const log: OperationLog = {
      id: generateId(),
      type: 'swap',
      chemicalId,
      chemicalName: chemical.name,
      fromSlotId,
      toSlotId,
      timestamp: Date.now(),
      scoreChange: 0,
      risks
    };

    const allRisks = engine.checkAllRisks();

    const updatedGame: GameState = {
      ...game,
      shelf: game.shelf,
      operationLogs: [...game.operationLogs, log],
      riskEvents: allRisks
    };

    set({ currentGame: updatedGame });
    storage.saveGameState(updatedGame);
    return true;
  },

  undoLastOperation: (): boolean => {
    return false;
  },

  completeGame: (): GameHistory | null => {
    const state = get();
    const game = state.currentGame;
    const level = state.getLevelById(game?.levelId || '');
    
    if (!game || !level) return null;

    const endTime = Date.now();
    const duration = Math.floor((endTime - game.startTime) / 1000);
    const timeRemaining = Math.max(0, level.timeLimit - duration);
    const timeBonus = ScoringEngine.calculateTimeBonus(timeRemaining, level.timeLimit);
    const hasZeroRisks = game.riskEvents.length === 0;
    const perfectBonus = ScoringEngine.calculatePerfectBonus(hasZeroRisks);
    const finalScore = game.currentScore + timeBonus + perfectBonus;

    const criticalCount = game.riskEvents.filter(r => r.severity === 'critical').length;

    const history: GameHistory = {
      id: game.id,
      levelId: game.levelId,
      levelName: level.name,
      startTime: game.startTime,
      endTime,
      finalScore,
      maxScore: game.maxPossibleScore + timeBonus + perfectBonus,
      riskCount: game.riskEvents.length,
      criticalRiskCount: criticalCount,
      operations: game.operationLogs,
      risks: game.riskEvents,
      reportExported: false,
      duration
    };

    storage.saveHistory(history);
    storage.clearGameState();

    set({
      currentGame: {
        ...game,
        endTime,
        currentScore: finalScore,
        isCompleted: true
      },
      histories: storage.getHistories()
    });

    return history;
  },

  pauseGame: () => {
    const game = get().currentGame;
    if (game && !game.isCompleted) {
      set({ currentGame: { ...game, isPaused: true } });
    }
  },

  resumeFromPause: () => {
    const game = get().currentGame;
    if (game) {
      set({ currentGame: { ...game, isPaused: false } });
    }
  },

  resetGame: () => {
    storage.clearGameState();
    set({ currentGame: null, riskEngine: null });
  },

  getChemicalById: (id: string) => chemicals.find(c => c.id === id),

  getSlotById: (slotId: string) => {
    const game = get().currentGame;
    return game?.shelf.slots.find(s => s.id === slotId);
  },

  getCurrentRisks: () => {
    const engine = get().riskEngine;
    if (!engine) return [];
    return engine.checkAllRisks();
  },

  getLevelById: (levelId: string) => levels.find(l => l.id === levelId),

  getHistories: () => storage.getHistories(),

  deleteHistory: (id: string) => {
    storage.deleteHistory(id);
    set({ histories: storage.getHistories() });
  },

  clearHistories: () => {
    storage.clearAllHistories();
    set({ histories: [] });
  },

  getHistoryById: (id: string) => storage.getHistoryById(id)
}));
