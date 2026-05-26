import { create } from 'zustand';
import type { GameState, ReplayRecord, LevelConfig } from '../types/game';
import {
  createInitialState,
  dispatchTeam,
  recallTeam,
  endRound,
  calculateMaxScore,
  toPublicState,
  type InternalGameState
} from '../utils/gameEngine';
import { LEVELS, getLevelById } from '../data/levels';

interface GameStore {
  internalState: InternalGameState | null;
  publicState: GameState | null;
  currentLevel: LevelConfig | null;
  selectedTeamId: string | null;
  replays: ReplayRecord[];
  dispatch: (teamId: string, areaId: string) => void;
  recall: (teamId: string) => void;
  endTurn: () => void;
  selectTeam: (teamId: string | null) => void;
  startLevel: (levelId: string) => void;
  restartLevel: () => void;
  exitToMenu: () => void;
  saveReplay: () => ReplayRecord | null;
}

const REPLAYS_KEY = 'power-repair-replays';

function loadReplays(): ReplayRecord[] {
  try {
    const data = localStorage.getItem(REPLAYS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveReplays(replays: ReplayRecord[]) {
  try {
    localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays));
  } catch {
    // ignore
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  internalState: null,
  publicState: null,
  currentLevel: null,
  selectedTeamId: null,
  replays: loadReplays(),

  startLevel: (levelId: string) => {
    const level = getLevelById(levelId);
    if (!level) return;
    const internalState = createInitialState(level);
    set({
      internalState,
      publicState: toPublicState(internalState),
      currentLevel: level,
      selectedTeamId: null
    });
  },

  restartLevel: () => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const internalState = createInitialState(currentLevel);
    set({
      internalState,
      publicState: toPublicState(internalState),
      selectedTeamId: null
    });
  },

  exitToMenu: () => {
    set({
      internalState: null,
      publicState: null,
      currentLevel: null,
      selectedTeamId: null
    });
  },

  selectTeam: (teamId) => {
    set({ selectedTeamId: teamId });
  },

  dispatch: (teamId, areaId) => {
    const { internalState } = get();
    if (!internalState || internalState.gameOver) return;
    const result = dispatchTeam(internalState, teamId, areaId);
    set({
      internalState: result.state,
      publicState: toPublicState(result.state),
      selectedTeamId: null
    });
  },

  recall: (teamId) => {
    const { internalState } = get();
    if (!internalState || internalState.gameOver) return;
    const result = recallTeam(internalState, teamId);
    set({
      internalState: result.state,
      publicState: toPublicState(result.state)
    });
  },

  endTurn: () => {
    const { internalState } = get();
    if (!internalState || internalState.gameOver) return;
    const newState = endRound(internalState);
    set({
      internalState: newState,
      publicState: toPublicState(newState)
    });
  },

  saveReplay: () => {
    const { internalState, currentLevel, replays } = get();
    if (!internalState || !currentLevel) return null;

    const maxScore = calculateMaxScore(currentLevel);
    const replay: ReplayRecord = {
      id: `replay-${Date.now()}`,
      levelId: currentLevel.id,
      levelName: currentLevel.name,
      startTime: internalState.logs[0]?.timestamp || Date.now(),
      endTime: Date.now(),
      finalScore: internalState.score,
      maxScore,
      actions: internalState.dispatchHistory,
      stateSnapshots: internalState.stateSnapshots,
      failReasons: internalState.failReasons
    };

    const newReplays = [replay, ...replays].slice(0, 20);
    saveReplays(newReplays);
    set({ replays: newReplays });

    return replay;
  }
}));

export function getLevelConfig(id: string): LevelConfig | undefined {
  return LEVELS.find(l => l.id === id);
}

export function getAllLevels(): LevelConfig[] {
  return LEVELS;
}