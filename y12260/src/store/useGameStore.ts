import { create } from 'zustand';
import { GameState, Position, DeviceType, ToolType } from '@/types';
import { GameEngine } from '@/engine/GameEngine';
import { DEFAULT_LEVEL } from '@/data/levels';
import { ScoreCalculationResult, ScoreCalculator } from '@/engine/ScoreCalculator';

interface GameStore extends GameState {
  scoreResult: ScoreCalculationResult | null;
  humanReport: string;
  hoveredCell: Position | null;
  setHoveredCell: (pos: Position | null) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  finishGame: () => void;
  tick: () => void;
  setTool: (tool: ToolType) => void;
  selectDevice: (deviceType: DeviceType | null) => void;
  handleGridClick: (position: Position) => void;
  removeDevice: (deviceId: string) => void;
  removeCable: (cableId: string) => void;
  removeWalkPath: (pathId: string) => void;
  setWalkMusician: (musician: string) => void;
  generateReport: () => void;
  loadState: (state: GameState) => void;
  currentMusician: string;
  reviewFrame: number;
  isReviewPlaying: boolean;
  reviewHistory: GameState[];
  setReviewFrame: (frame: number) => void;
  toggleReviewPlay: () => void;
  buildReviewHistory: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...GameEngine.createInitialState(DEFAULT_LEVEL),
  scoreResult: null,
  humanReport: '',
  hoveredCell: null,
  setHoveredCell: (pos: Position | null) => set({ hoveredCell: pos }),
  currentMusician: '主唱',
  reviewFrame: 0,
  isReviewPlaying: false,
  reviewHistory: [],

  startGame: () => {
    set(state => GameEngine.startGame(state));
  },

  pauseGame: () => {
    set(state => GameEngine.pauseGame(state));
  },

  resumeGame: () => {
    set(state => GameEngine.resumeGame(state));
  },

  restartGame: () => {
    set({
      ...GameEngine.createInitialState(DEFAULT_LEVEL),
      scoreResult: null,
      humanReport: '',
      currentMusician: '主唱',
      reviewFrame: 0,
      isReviewPlaying: false,
      reviewHistory: []
    });
  },

  finishGame: () => {
    const state = get();
    const finalState = GameEngine.finishGame(state);
    const scoreResult = ScoreCalculator.calculate(
      finalState.placedDevices,
      finalState.cables,
      finalState.walkPaths,
      finalState.conflicts,
      finalState.level,
      finalState.timeLeft,
      finalState.totalTime
    );
    const humanReport = GameEngine.generateHumanReport(finalState);
    set({ ...finalState, scoreResult, humanReport });
  },

  tick: () => {
    set(state => GameEngine.tick(state));
  },

  setTool: (tool: ToolType) => {
    set(state => GameEngine.setTool(state, tool));
  },

  selectDevice: (deviceType: DeviceType | null) => {
    set(state => GameEngine.selectDevice(state, deviceType));
  },

  handleGridClick: (position: Position) => {
    set(state => {
      if (state.currentTool === 'walk') {
        return GameEngine.handleWalkClick(state, position, state.currentMusician);
      }
      return GameEngine.handleGridClick(state, position);
    });
  },

  removeDevice: (deviceId: string) => {
    set(state => GameEngine.removeDevice(state, deviceId));
  },

  removeCable: (cableId: string) => {
    set(state => GameEngine.removeCable(state, cableId));
  },

  removeWalkPath: (pathId: string) => {
    set(state => GameEngine.removeWalkPath(state, pathId));
  },

  setWalkMusician: (musician: string) => {
    set({ currentMusician: musician });
  },

  generateReport: () => {
    const state = get();
    const report = GameEngine.generateHumanReport(state);
    set({ humanReport: report });
  },

  loadState: (state: GameState) => {
    set({ ...state });
  },

  setReviewFrame: (frame: number) => {
    set({ reviewFrame: frame });
  },

  toggleReviewPlay: () => {
    set(state => ({ isReviewPlaying: !state.isReviewPlaying }));
  },

  buildReviewHistory: () => {
    const state = get();
    const history: GameState[] = [];
    let currentState = GameEngine.createInitialState(state.level);
    history.push({ ...currentState });

    for (const action of state.history) {
      switch (action.type) {
        case 'place_device':
          if (action.payload.device) {
            currentState = {
              ...currentState,
              placedDevices: [...currentState.placedDevices, action.payload.device]
            };
          }
          break;
        case 'remove_device':
          currentState = {
            ...currentState,
            placedDevices: currentState.placedDevices.filter(d => d.id !== action.payload.deviceId),
            cables: currentState.cables.filter(cable => {
              const device = currentState.placedDevices.find(d => d.id === action.payload.deviceId);
              if (!device) return true;
              const fromOnDevice = device.position.x === cable.from.x && device.position.y === cable.from.y;
              const toOnDevice = device.position.x === cable.to.x && device.position.y === cable.to.y;
              return !fromOnDevice && !toOnDevice;
            })
          };
          break;
        case 'draw_cable':
          currentState = {
            ...currentState,
            cables: [...currentState.cables, action.payload.cable]
          };
          break;
        case 'remove_cable':
          currentState = {
            ...currentState,
            cables: currentState.cables.filter(c => c.id !== action.payload.cableId)
          };
          break;
        case 'draw_path':
          currentState = {
            ...currentState,
            walkPaths: [...currentState.walkPaths, action.payload.path]
          };
          break;
        case 'remove_path':
          currentState = {
            ...currentState,
            walkPaths: currentState.walkPaths.filter(p => p.id !== action.payload.pathId)
          };
          break;
      }
      history.push({ ...currentState });
    }

    set({ reviewHistory: history, reviewFrame: history.length - 1 });
  }
}));
