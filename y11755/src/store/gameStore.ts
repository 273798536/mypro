import { create } from 'zustand';
import { GameState, SceneConfig, WarningType, RepairReport } from '../game/types';
import { SCENES } from '../game/config';
import {
  createInitialState,
  toggleValve,
  confirmOperation,
  cancelOperation,
  startGame,
  finishGame,
  resetGame,
  generateReport,
  calculateGameState,
  getStateAtStep,
} from '../game/engine';
import { ScoreBreakdown } from '../game/scoring';

interface GameStore {
  currentScene: SceneConfig;
  gameState: GameState;
  scoreBreakdown: ScoreBreakdown | null;
  report: RepairReport | null;
  showReport: boolean;
  replayStepIndex: number | null;
  viewMode: 'game' | 'replay';

  startNewGame: () => void;
  handleValveClick: (valveId: string) => void;
  confirmPendingOperation: () => void;
  cancelPendingOperation: () => void;
  endGame: () => void;
  resetCurrentGame: () => void;
  toggleReport: () => void;
  startReplay: () => void;
  stopReplay: () => void;
  setReplayStep: (stepIndex: number) => void;
  exportReport: () => void;
  calculateScore: () => void;
}

const initialScene = SCENES[0];
const initialState = createInitialState(initialScene);

export const useGameStore = create<GameStore>((set, get) => ({
  currentScene: initialScene,
  gameState: initialState,
  scoreBreakdown: null,
  report: null,
  showReport: false,
  replayStepIndex: null,
  viewMode: 'game',

  startNewGame: () => {
    const scene = get().currentScene;
    const newState = createInitialState(scene);
    const startedState = startGame(newState, Date.now());
    set({
      gameState: startedState,
      scoreBreakdown: null,
      report: null,
      showReport: false,
      replayStepIndex: null,
      viewMode: 'game',
    });
  },

  handleValveClick: (valveId: string) => {
    const { gameState, viewMode } = get();
    if (viewMode !== 'game' || gameState.status !== 'playing') return;

    const timestamp = Date.now();
    const { newState, needsConfirmation } = toggleValve(gameState, valveId, timestamp);

    if (needsConfirmation) {
      set({ gameState: newState });
    } else {
      set({ gameState: newState });
      get().calculateScore();
    }
  },

  confirmPendingOperation: () => {
    const { gameState } = get();
    const newState = confirmOperation(gameState);
    set({ gameState: newState });
    get().calculateScore();
  },

  cancelPendingOperation: () => {
    const { gameState } = get();
    const newState = cancelOperation(gameState);
    set({ gameState: newState });
  },

  endGame: () => {
    const { gameState, currentScene } = get();
    const endTime = Date.now();
    const finishedState = finishGame(gameState, endTime);
    const engineResult = calculateGameState(finishedState, currentScene);
    const report = generateReport(finishedState, currentScene, engineResult.score);

    set({
      gameState: finishedState,
      scoreBreakdown: engineResult.score,
      report,
      showReport: true,
    });
  },

  resetCurrentGame: () => {
    const scene = get().currentScene;
    const newState = resetGame(scene);
    set({
      gameState: newState,
      scoreBreakdown: null,
      report: null,
      showReport: false,
      replayStepIndex: null,
      viewMode: 'game',
    });
  },

  toggleReport: () => {
    const { showReport, gameState, currentScene, scoreBreakdown } = get();

    if (!showReport && !scoreBreakdown) {
      const engineResult = calculateGameState(gameState, currentScene);
      const report = generateReport(gameState, currentScene, engineResult.score);
      set({
        showReport: true,
        scoreBreakdown: engineResult.score,
        report,
      });
    } else {
      set({ showReport: !showReport });
    }
  },

  startReplay: () => {
    const { gameState } = get();
    if (gameState.operations.length === 0) return;

    set({
      viewMode: 'replay',
      replayStepIndex: 0,
    });
  },

  stopReplay: () => {
    set({
      viewMode: 'game',
      replayStepIndex: null,
    });
  },

  setReplayStep: (stepIndex: number) => {
    const { gameState, currentScene } = get();
    if (stepIndex < 0 || stepIndex >= gameState.operations.length) return;

    const replayState = getStateAtStep(gameState, stepIndex, currentScene);
    set({
      replayStepIndex: stepIndex,
      gameState: { ...replayState, status: 'replaying' },
    });
  },

  exportReport: () => {
    const { report } = get();
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repair-report-${report.gameId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  calculateScore: () => {
    const { gameState, currentScene } = get();
    const engineResult = calculateGameState(gameState, currentScene);
    set({ scoreBreakdown: engineResult.score });
  },
}));
