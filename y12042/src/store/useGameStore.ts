import { create } from 'zustand';
import type { GameState, OperationMode, GridCell, OperationRecord, AnomalyRecord, ImportResult, LevelConfig, ShortCircuitEvent, PowerToScoreChain, ScoreDetail, BadRow } from '../engine/types';
import { initializeGridFromLevel, repairCell, isolateCell, connectCells, getCellById, createCellId, cloneGrid } from '../engine/GridSystem';
import { checkCircuitConnectivity, updatePoweredState, calculatePowerConsumption, checkLoadPowered } from '../engine/CircuitSimulator';
import { simulateShortCircuit, applyShortCircuitToGrid, createShortCircuitAnomaly, findShortCircuitOrigins } from '../engine/ShortCircuit';
import { calculateScore, buildPowerToScoreChain, createLowPowerAnomaly, createPathBlockedAnomaly } from '../engine/ScoringEngine';
import { parseCSVFile, parseCSVContent } from '../utils/csvParser';
import { mergeImportedAnomalies, filterAnomalies } from '../utils/anomalyFilter';
import { getLevelById } from '../data/levels';
import { generateGameId } from '../utils/exporter';

interface GameStore {
  gameState: GameState;
  currentLevel: LevelConfig | null;
  gameId: string;
  shortCircuitEvents: ShortCircuitEvent[];
  replayIndex: number;
  isReplaying: boolean;
  importedData: {
    faultCards: ImportResult | null;
    powerMeters: ImportResult | null;
  };
  badRows: BadRow[];
  savedGames: { id: string; levelId: string; timestamp: number }[];

  setOperationMode: (mode: OperationMode) => void;
  handleCellClick: (cellId: string) => void;
  useRepairKit: (cellId: string) => boolean;
  isolateCellAction: (cellId: string) => void;
  connectCellsAction: (cellId1: string, cellId2: string) => void;

  startGame: (levelId: string) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  endGame: (result: 'win' | 'lose') => void;

  tick: (deltaTime: number) => void;

  startReplay: () => void;
  stepReplay: (direction: 'forward' | 'backward') => void;
  jumpToReplayIndex: (index: number) => void;
  stopReplay: () => void;

  importData: (file: File, source: 'fault_card' | 'power_meter') => Promise<ImportResult>;
  loadSampleData: (source: 'fault_card' | 'power_meter', content: string) => ImportResult;
  getFilteredAnomalies: (type?: 'short_circuit' | 'low_power' | 'path_blocked') => AnomalyRecord[];
  markAsReviewed: (anomalyId: string) => void;
  clearImportedData: () => void;

  calculateFinalScore: () => ScoreDetail | null;
  buildFullChain: () => PowerToScoreChain | null;
  saveGame: () => void;
  loadSavedGame: (gameId: string) => void;
}

const initialGameState: GameState = {
  grid: [],
  powerNodes: [],
  loadNodes: [],
  totalPower: 100,
  consumedPower: 0,
  timeElapsed: 0,
  shortCircuitTimer: 0,
  isPaused: false,
  isGameOver: false,
  gameResult: null,
  operationMode: 'repair',
  operationLog: [],
  anomalies: [],
  repairKits: 5,
  selectedCell: null,
  levelId: '',
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: initialGameState,
  currentLevel: null,
  gameId: '',
  shortCircuitEvents: [],
  replayIndex: 0,
  isReplaying: false,
  importedData: {
    faultCards: null,
    powerMeters: null,
  },
  badRows: [],
  savedGames: [],

  setOperationMode: (mode) => {
    set(state => ({
      gameState: { ...state.gameState, operationMode: mode, selectedCell: null },
    }));
  },

  handleCellClick: (cellId) => {
    const state = get();
    if (state.gameState.isPaused || state.gameState.isGameOver || state.isReplaying) return;

    const { operationMode, selectedCell } = state.gameState;
    const cell = getCellById(state.gameState.grid, cellId);
    if (!cell) return;

    if (operationMode === 'repair') {
      if (cell.type === 'fault' || cell.status === 'damaged') {
        get().useRepairKit(cellId);
      }
    } else if (operationMode === 'isolate') {
      if (cell.type !== 'power' && cell.type !== 'blocked' && cell.type !== 'empty') {
        get().isolateCellAction(cellId);
      }
    } else if (operationMode === 'connect') {
      if (!selectedCell) {
        set(s => ({
          gameState: { ...s.gameState, selectedCell: cellId },
        }));
      } else if (selectedCell !== cellId) {
        get().connectCellsAction(selectedCell, cellId);
        set(s => ({
          gameState: { ...s.gameState, selectedCell: null },
        }));
      } else {
        set(s => ({
          gameState: { ...s.gameState, selectedCell: null },
        }));
      }
    }
  },

  useRepairKit: (cellId) => {
    const state = get();
    if (state.gameState.repairKits <= 0) return false;
    if (state.gameState.isPaused || state.gameState.isGameOver) return false;

    const cell = getCellById(state.gameState.grid, cellId);
    if (!cell) return false;

    const beforeState = { ...cell };
    const newGrid = repairCell(state.gameState.grid, cellId);
    const { poweredCells } = checkCircuitConnectivity(newGrid, state.gameState.powerNodes);
    const updatedGrid = updatePoweredState(newGrid, poweredCells);

    const afterCell = getCellById(updatedGrid, cellId);

    const operation: OperationRecord = {
      timestamp: state.gameState.timeElapsed,
      type: 'repair',
      cellId,
      beforeState,
      afterState: afterCell ? { ...afterCell } : {},
      powerSnapshot: state.gameState.totalPower - state.gameState.consumedPower,
    };

    set(s => ({
      gameState: {
        ...s.gameState,
        grid: updatedGrid,
        repairKits: s.gameState.repairKits - 1,
        operationLog: [...s.gameState.operationLog, operation],
      },
    }));

    return true;
  },

  isolateCellAction: (cellId) => {
    const state = get();
    if (state.gameState.isPaused || state.gameState.isGameOver) return;

    const cell = getCellById(state.gameState.grid, cellId);
    if (!cell) return;

    const beforeState = { ...cell };
    const newGrid = isolateCell(state.gameState.grid, cellId);
    const { poweredCells } = checkCircuitConnectivity(newGrid, state.gameState.powerNodes);
    const updatedGrid = updatePoweredState(newGrid, poweredCells);

    const afterCell = getCellById(updatedGrid, cellId);

    const operation: OperationRecord = {
      timestamp: state.gameState.timeElapsed,
      type: 'isolate',
      cellId,
      beforeState,
      afterState: afterCell ? { ...afterCell } : {},
      powerSnapshot: state.gameState.totalPower - state.gameState.consumedPower,
    };

    set(s => ({
      gameState: {
        ...s.gameState,
        grid: updatedGrid,
        operationLog: [...s.gameState.operationLog, operation],
      },
    }));
  },

  connectCellsAction: (cellId1, cellId2) => {
    const state = get();
    if (state.gameState.isPaused || state.gameState.isGameOver) return;

    const cell1 = getCellById(state.gameState.grid, cellId1);
    const cell2 = getCellById(state.gameState.grid, cellId2);
    if (!cell1 || !cell2) return;

    const beforeState1 = { ...cell1 };
    const newGrid = connectCells(state.gameState.grid, cellId1, cellId2);
    const { poweredCells, paths } = checkCircuitConnectivity(newGrid, state.gameState.powerNodes);
    const updatedGrid = updatePoweredState(newGrid, poweredCells);

    const { totalConsumption, insufficientLoads } = calculatePowerConsumption(
      paths,
      state.gameState.loadNodes,
      updatedGrid
    );

    const afterCell1 = getCellById(updatedGrid, cellId1);

    const operation: OperationRecord = {
      timestamp: state.gameState.timeElapsed,
      type: 'connect',
      cellId: cellId1,
      beforeState: beforeState1,
      afterState: afterCell1 ? { ...afterCell1 } : {},
      powerSnapshot: state.gameState.totalPower - state.gameState.consumedPower,
    };

    const newAnomalies: AnomalyRecord[] = [...state.gameState.anomalies];

    if (insufficientLoads.length > 0) {
      const anomaly = createLowPowerAnomaly(
        state.gameState.timeElapsed,
        insufficientLoads,
        state.gameState.totalPower - state.gameState.consumedPower,
        totalConsumption
      );
      newAnomalies.push(anomaly);
    }

    set(s => ({
      gameState: {
        ...s.gameState,
        grid: updatedGrid,
        consumedPower: s.gameState.consumedPower + totalConsumption,
        operationLog: [...s.gameState.operationLog, operation],
        anomalies: newAnomalies,
      },
    }));
  },

  startGame: (levelId) => {
    const level = getLevelById(levelId);
    if (!level) return;

    const { grid, powerNodes, loadNodes } = initializeGridFromLevel(level);
    const { poweredCells } = checkCircuitConnectivity(grid, powerNodes);
    const updatedGrid = updatePoweredState(grid, poweredCells);

    const newGameId = generateGameId();

    set({
      currentLevel: level,
      gameId: newGameId,
      shortCircuitEvents: [],
      replayIndex: 0,
      isReplaying: false,
      gameState: {
        ...initialGameState,
        grid: updatedGrid,
        powerNodes,
        loadNodes,
        totalPower: level.totalPower,
        repairKits: level.repairKits,
        levelId: level.id,
      },
    });
  },

  pauseGame: () => {
    set(state => ({
      gameState: { ...state.gameState, isPaused: true },
    }));
  },

  resumeGame: () => {
    set(state => ({
      gameState: { ...state.gameState, isPaused: false },
    }));
  },

  restartGame: () => {
    const state = get();
    if (state.currentLevel) {
      get().startGame(state.currentLevel.id);
    }
  },

  endGame: (result) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        isGameOver: true,
        gameResult: result,
        isPaused: true,
      },
    }));
  },

  tick: (deltaTime) => {
    const state = get();
    if (state.gameState.isPaused || state.gameState.isGameOver || state.isReplaying) return;

    let newGrid = cloneGrid(state.gameState.grid);
    let newConsumedPower = state.gameState.consumedPower;
    let newAnomalies = [...state.gameState.anomalies];
    let newShortCircuitTimer = state.gameState.shortCircuitTimer + deltaTime;
    let newTimeElapsed = state.gameState.timeElapsed + deltaTime;
    let newShortCircuitEvents = [...state.shortCircuitEvents];

    const { poweredCells, paths } = checkCircuitConnectivity(newGrid, state.gameState.powerNodes);
    newGrid = updatePoweredState(newGrid, poweredCells);

    const { allPowered, unpoweredLoads } = checkLoadPowered(
      newGrid,
      state.gameState.loadNodes,
      poweredCells
    );

    if (allPowered) {
      const { totalConsumption } = calculatePowerConsumption(
        paths,
        state.gameState.loadNodes,
        newGrid
      );
      newConsumedPower += totalConsumption * deltaTime;

      if (newConsumedPower >= state.gameState.totalPower * 0.9) {
        const anomaly = createLowPowerAnomaly(
          newTimeElapsed,
          state.gameState.loadNodes,
          state.gameState.totalPower - newConsumedPower,
          totalConsumption * 10
        );
        if (!newAnomalies.find(a => a.description === anomaly.description)) {
          newAnomalies.push(anomaly);
        }
      }

      if (allPowered && newConsumedPower < state.gameState.totalPower) {
        set(s => ({
          gameState: {
            ...s.gameState,
            grid: newGrid,
            consumedPower: newConsumedPower,
            timeElapsed: newTimeElapsed,
            shortCircuitTimer: newShortCircuitTimer,
            anomalies: newAnomalies,
          },
        }));
        return;
      }
    }

    const shortOrigins = findShortCircuitOrigins(newGrid);
    if (shortOrigins.length > 0) {
      const shortResult = simulateShortCircuit(
        newGrid,
        shortOrigins,
        state.gameState.powerNodes,
        newShortCircuitTimer,
        state.currentLevel?.shortCircuitInterval || 3
      );

      if (shortResult.diffusionPath.length > 0) {
        newGrid = applyShortCircuitToGrid(newGrid, shortResult.newShortCells);
        
        const event: ShortCircuitEvent = {
          timestamp: newTimeElapsed,
          startCell: shortOrigins[0],
          diffusionPath: shortResult.diffusionPath,
        };
        newShortCircuitEvents.push(event);

        const anomaly = createShortCircuitAnomaly(
          newTimeElapsed,
          shortOrigins[0],
          shortResult.diffusionPath
        );
        newAnomalies.push(anomaly);

        newShortCircuitTimer = 0;
      }

      if (shortResult.shouldGameOver) {
        set(s => ({
          gameState: {
            ...s.gameState,
            grid: newGrid,
            timeElapsed: newTimeElapsed,
            shortCircuitTimer: 0,
            anomalies: newAnomalies,
            isGameOver: true,
            gameResult: 'lose',
            isPaused: true,
          },
          shortCircuitEvents: newShortCircuitEvents,
        }));
        return;
      }
    }

    set(s => ({
      gameState: {
        ...s.gameState,
        grid: newGrid,
        consumedPower: newConsumedPower,
        timeElapsed: newTimeElapsed,
        shortCircuitTimer: newShortCircuitTimer,
        anomalies: newAnomalies,
      },
      shortCircuitEvents: newShortCircuitEvents,
    }));
  },

  startReplay: () => {
    set({
      isReplaying: true,
      replayIndex: 0,
    });
  },

  stepReplay: (direction) => {
    const state = get();
    const maxIndex = state.gameState.operationLog.length;
    
    if (direction === 'forward' && state.replayIndex < maxIndex) {
      set({ replayIndex: state.replayIndex + 1 });
    } else if (direction === 'backward' && state.replayIndex > 0) {
      set({ replayIndex: state.replayIndex - 1 });
    }
  },

  jumpToReplayIndex: (index) => {
    const state = get();
    const maxIndex = state.gameState.operationLog.length;
    set({ replayIndex: Math.max(0, Math.min(index, maxIndex)) });
  },

  stopReplay: () => {
    set({ isReplaying: false });
  },

  importData: async (file, source) => {
    const result = await parseCSVFile(file, source);
    
    set(state => {
      const newBadRows = [...state.badRows, ...result.badRows];
      const newAnomalies = mergeImportedAnomalies(
        state.gameState.anomalies,
        result.validRows,
        source
      );
      
      return {
        importedData: {
          ...state.importedData,
          [source === 'fault_card' ? 'faultCards' : 'powerMeters']: result,
        },
        badRows: newBadRows,
        gameState: {
          ...state.gameState,
          anomalies: newAnomalies,
        },
      };
    });

    return result;
  },

  loadSampleData: (source, content) => {
    const result = parseCSVContent(content, source, 'sample_data');
    
    set(state => {
      const newBadRows = [...state.badRows, ...result.badRows];
      const newAnomalies = mergeImportedAnomalies(
        state.gameState.anomalies,
        result.validRows,
        source
      );
      
      return {
        importedData: {
          ...state.importedData,
          [source === 'fault_card' ? 'faultCards' : 'powerMeters']: result,
        },
        badRows: newBadRows,
        gameState: {
          ...state.gameState,
          anomalies: newAnomalies,
        },
      };
    });

    return result;
  },

  getFilteredAnomalies: (type) => {
    return filterAnomalies(get().gameState.anomalies, type);
  },

  markAsReviewed: (anomalyId) => {
    set(state => ({
      gameState: {
        ...state.gameState,
        anomalies: state.gameState.anomalies.map(a =>
          a.id === anomalyId ? { ...a, isReviewed: true } : a
        ),
      },
    }));
  },

  clearImportedData: () => {
    set({
      importedData: {
        faultCards: null,
        powerMeters: null,
      },
      badRows: [],
    });
  },

  calculateFinalScore: () => {
    const state = get();
    if (!state.currentLevel) return null;
    return calculateScore(state.gameState, state.currentLevel);
  },

  buildFullChain: () => {
    const state = get();
    const score = get().calculateFinalScore();
    if (!score) return null;
    
    return buildPowerToScoreChain(
      state.gameState,
      score,
      state.shortCircuitEvents
    );
  },

  saveGame: () => {
    const state = get();
    const saveData = {
      gameId: state.gameId,
      levelId: state.currentLevel?.id,
      gameState: state.gameState,
      shortCircuitEvents: state.shortCircuitEvents,
      timestamp: Date.now(),
    };
    
    try {
      const savedGames = JSON.parse(localStorage.getItem('circuit_saves') || '[]');
      savedGames.push({
        id: state.gameId,
        levelId: state.currentLevel?.id,
        timestamp: Date.now(),
      });
      localStorage.setItem('circuit_saves', JSON.stringify(savedGames));
      localStorage.setItem(`circuit_save_${state.gameId}`, JSON.stringify(saveData));
      
      set({ savedGames });
    } catch (e) {
      console.error('Failed to save game:', e);
    }
  },

  loadSavedGame: (gameId) => {
    try {
      const saveData = JSON.parse(localStorage.getItem(`circuit_save_${gameId}`) || 'null');
      if (saveData && saveData.gameState) {
        const level = getLevelById(saveData.levelId);
        set({
          gameId: saveData.gameId,
          currentLevel: level || null,
          gameState: saveData.gameState,
          shortCircuitEvents: saveData.shortCircuitEvents || [],
        });
      }
    } catch (e) {
      console.error('Failed to load game:', e);
    }
  },
}));
