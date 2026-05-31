import { create } from 'zustand';
import { GameState, ToolType, ReplayState, ExampleGame } from '../types';
import {
  createInitialGameState,
  placePowerStation,
  placeWire,
  repairAnomaly,
  selectTool,
  selectNode,
  resetGame,
  getUsedTools,
} from '../engine/gameEngine';
import { restoreFromSnapshot } from '../engine/replayRecorder';
import { getExampleById } from '../data/examples';

interface GameStore {
  gameState: GameState;
  replayState: ReplayState | null;
  isReplayMode: boolean;
  exampleGame: ExampleGame | null;

  actions: {
    placePowerStation: (nodeId: string) => void;
    placeWire: (fromNodeId: string, toNodeId: string) => void;
    repairAnomaly: (anomalyId: string) => void;
    selectTool: (tool: ToolType | null) => void;
    selectNode: (nodeId: string | null) => void;
    handleNodeClick: (nodeId: string) => void;
    resetGame: () => void;

    startReplay: (gameId: string) => void;
    stopReplay: () => void;
    setReplayStep: (step: number) => void;
    toggleReplayPlay: () => void;
    setReplaySpeed: (speed: number) => void;

    loadExample: (exampleId: string) => void;
    clearExample: () => void;
    playExampleStep: () => void;
    replayExampleToStep: (targetStep: number) => void;
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialGameState(),
  replayState: null,
  isReplayMode: false,
  exampleGame: null,

  actions: {
    placePowerStation: (nodeId: string) => {
      set(state => ({
        gameState: placePowerStation(state.gameState, nodeId),
      }));
    },

    placeWire: (fromNodeId: string, toNodeId: string) => {
      set(state => ({
        gameState: placeWire(state.gameState, fromNodeId, toNodeId),
      }));
    },

    repairAnomaly: (anomalyId: string) => {
      set(state => ({
        gameState: repairAnomaly(state.gameState, anomalyId),
      }));
    },

    selectTool: (tool: ToolType | null) => {
      set(state => ({
        gameState: selectTool(state.gameState, tool),
      }));
    },

    selectNode: (nodeId: string | null) => {
      set(state => ({
        gameState: selectNode(state.gameState, nodeId),
      }));
    },

    handleNodeClick: (nodeId: string) => {
      const { gameState } = get();
      const { selectedTool, selectedNode } = gameState;

      if (selectedTool === 'power_station') {
        get().actions.placePowerStation(nodeId);
        return;
      }

      if (selectedTool === 'wire') {
        if (!selectedNode) {
          get().actions.selectNode(nodeId);
        } else if (selectedNode !== nodeId) {
          get().actions.placeWire(selectedNode, nodeId);
        } else {
          get().actions.selectNode(null);
        }
        return;
      }

      if (selectedTool === 'repair_team') {
        const nodeAnomalies = gameState.anomalies.filter(
          a => !a.resolved && a.relatedNodeIds.includes(nodeId)
        );
        if (nodeAnomalies.length > 0) {
          get().actions.repairAnomaly(nodeAnomalies[0].id);
        }
        return;
      }

      get().actions.selectNode(nodeId);
    },

    resetGame: () => {
      set({
        gameState: resetGame(),
        replayState: null,
        isReplayMode: false,
        exampleGame: null,
      });
    },

    startReplay: (gameId: string) => {
      set({
        isReplayMode: true,
        replayState: {
          gameId,
          currentStep: 0,
          isPlaying: false,
          speed: 1,
        },
      });
    },

    stopReplay: () => {
      set({
        isReplayMode: false,
        replayState: null,
      });
    },

    setReplayStep: (step: number) => {
      set(state => {
        if (!state.replayState) return state;
        const snapshot = state.gameState.snapshots[step];
        if (!snapshot) return state;

        return {
          replayState: {
            ...state.replayState,
            currentStep: step,
          },
          gameState: restoreFromSnapshot(state.gameState, snapshot),
        };
      });
    },

    toggleReplayPlay: () => {
      set(state => {
        if (!state.replayState) return state;
        return {
          replayState: {
            ...state.replayState,
            isPlaying: !state.replayState.isPlaying,
          },
        };
      });
    },

    setReplaySpeed: (speed: number) => {
      set(state => {
        if (!state.replayState) return state;
        return {
          replayState: {
            ...state.replayState,
            speed,
          },
        };
      });
    },

    loadExample: (exampleId: string) => {
      const example = getExampleById(exampleId);
      if (!example) return;

      const initialState = createInitialGameState();
      const nodes = example.initialState.nodes || initialState.nodes;

      set({
        exampleGame: example,
        gameState: {
          ...initialState,
          id: example.id,
          nodes: JSON.parse(JSON.stringify(nodes)),
          wires: [],
          operations: [],
          anomalies: [],
          logicChains: [],
        },
        isReplayMode: false,
        replayState: null,
      });
    },

    clearExample: () => {
      set({
        exampleGame: null,
        gameState: createInitialGameState(),
      });
    },

    playExampleStep: () => {
      const { exampleGame, gameState } = get();
      if (!exampleGame) return;

      const currentStep = gameState.operations.length;
      if (currentStep >= exampleGame.operations.length) return;

      const nextOp = exampleGame.operations[currentStep];

      if (nextOp.type === 'place_power' && nextOp.nodeIds) {
        get().actions.placePowerStation(nextOp.nodeIds[0]);
      } else if (nextOp.type === 'place_wire' && nextOp.nodeIds) {
        get().actions.placeWire(nextOp.nodeIds[0], nextOp.nodeIds[1]);
      } else if (nextOp.type === 'place_repair') {
        const anomaly = gameState.anomalies.find(a => a.stepNumber === currentStep);
        if (anomaly) {
          get().actions.repairAnomaly(anomaly.id);
        }
      }
    },

    replayExampleToStep: (targetStep: number) => {
      const { exampleGame } = get();
      if (!exampleGame) return;

      const initialState = createInitialGameState();
      const nodes = exampleGame.initialState.nodes || initialState.nodes;

      let tempState: GameState = {
        ...initialState,
        id: exampleGame.id,
        nodes: JSON.parse(JSON.stringify(nodes)),
        wires: [],
        operations: [],
        anomalies: [],
        logicChains: [],
      };

      for (let i = 0; i < targetStep && i < exampleGame.operations.length; i++) {
        const op = exampleGame.operations[i];
        if (op.type === 'place_power' && op.nodeIds) {
          tempState = placePowerStation(tempState, op.nodeIds[0]);
        } else if (op.type === 'place_wire' && op.nodeIds) {
          tempState = placeWire(tempState, op.nodeIds[0], op.nodeIds[1]);
        }
      }

      set({ gameState: tempState });
    },
  },
}));

export const useGameStatus = () => useGameStore(state => state.gameState.status);
export const useCurrentStage = () => useGameStore(state => state.gameState.currentStage);
export const useScore = () => useGameStore(state => state.gameState.score);
export const useNodes = () => useGameStore(state => state.gameState.nodes);
export const useWires = () => useGameStore(state => state.gameState.wires);
export const useOperations = () => useGameStore(state => state.gameState.operations);
export const useAnomalies = () => useGameStore(state => state.gameState.anomalies);
export const useLogicChains = () => useGameStore(state => state.gameState.logicChains);
export const useUnlockedTools = () => useGameStore(state => state.gameState.unlockedTools);
export const useSelectedTool = () => useGameStore(state => state.gameState.selectedTool);
export const useSelectedNode = () => useGameStore(state => state.gameState.selectedNode);
export const useTriggerPoints = () => useGameStore(state => state.gameState.triggerPoints);
export const useCauseEffectChain = () => useGameStore(state => state.gameState.causeEffectChain);
export const useSnapshots = () => useGameStore(state => state.gameState.snapshots);
export const useIsReplayMode = () => useGameStore(state => state.isReplayMode);
export const useReplayState = () => useGameStore(state => state.replayState);
export const useExampleGame = () => useGameStore(state => state.exampleGame);
export const useUsedTools = () => {
  const operations = useOperations();
  return getUsedTools(operations);
};
