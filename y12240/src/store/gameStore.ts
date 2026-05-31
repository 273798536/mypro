import { create } from "zustand";
import type { GameState, Difficulty, BeatEvent, GameError, Judgment } from "@/types/game";
import { LEVEL_CONFIGS, generateTargetSequence, ALL_BRICKS } from "@/config/bricks";
import { judgeTiming, calcRhythmScore, calcSpectrumScore, detectErrors, calculateFinalScore } from "@/utils/scoring";

const VERSION = "v1.0";

interface GameStore extends GameState {
  startGame: (difficulty: Difficulty) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  resetGame: () => void;
  selectBrick: (brickId: string | null) => void;
  placeBrick: (beatIndex: number) => void;
  advanceBeat: () => void;
  setBeatEvents: (events: BeatEvent[]) => void;
}

const initialState: GameState = {
  gameId: "",
  difficulty: "beginner",
  status: "idle",
  currentBeat: 0,
  totalBeats: 0,
  bpm: 80,
  score: {
    spectrumSynthesisScore: 0,
    rhythmJudgmentScore: 0,
    waveformPlaybackScore: 0,
    aliasingDeduction: 0,
    misalignmentDeduction: 0,
    overFilteringDeduction: 0,
    totalScore: 0,
    grade: "D",
  },
  beatEvents: [],
  availableBricks: [],
  targetSequence: [],
  combo: 0,
  maxCombo: 0,
  version: VERSION,
  startTime: 0,
  selectedBrickId: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  startGame: (difficulty: Difficulty) => {
    const config = LEVEL_CONFIGS[difficulty];
    const targetSequence = generateTargetSequence(difficulty);
    set({
      gameId: `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      difficulty,
      status: "playing",
      currentBeat: 0,
      totalBeats: config.totalBeats,
      bpm: config.bpm,
      score: {
        spectrumSynthesisScore: 0,
        rhythmJudgmentScore: 0,
        waveformPlaybackScore: 0,
        aliasingDeduction: 0,
        misalignmentDeduction: 0,
        overFilteringDeduction: 0,
        totalScore: 0,
        grade: "D",
      },
      beatEvents: [],
      availableBricks: config.brickTypes,
      targetSequence,
      combo: 0,
      maxCombo: 0,
      version: VERSION,
      startTime: Date.now(),
      selectedBrickId: null,
    });
  },

  pauseGame: () => set({ status: "paused" }),
  resumeGame: () => set({ status: "playing" }),

  endGame: () => {
    const state = get();
    const score = calculateFinalScore(state.beatEvents, state.totalBeats);
    set({ status: "ended", score });
  },

  restartGame: () => {
    const { difficulty } = get();
    get().startGame(difficulty);
  },

  resetGame: () => set(initialState),

  selectBrick: (brickId: string | null) => set({ selectedBrickId: brickId }),

  placeBrick: (beatIndex: number) => {
    const state = get();
    if (state.status !== "playing") return;
    if (!state.selectedBrickId) return;

    const existing = state.beatEvents.find((e) => e.beatIndex === beatIndex);
    if (existing) return;

    const targetBrickIds = state.targetSequence[beatIndex] || [];
    const playerBrickIds = [state.selectedBrickId];
    const allBrickIds = state.availableBricks.map((b) => b.id);

    const expectedTime = state.startTime + (beatIndex * 60000) / state.bpm;
    const timingDelta = Date.now() - expectedTime;
    const judgment: Judgment = judgeTiming(timingDelta);

    const spectrumScore = calcSpectrumScore(playerBrickIds, targetBrickIds, allBrickIds);
    const rhythmScore = calcRhythmScore(judgment);

    const previousJudgments = state.beatEvents.map((e) => e.judgment);
    const errors: GameError[] = detectErrors(
      beatIndex,
      playerBrickIds,
      targetBrickIds,
      judgment,
      state.availableBricks,
      previousJudgments
    );

    const newCombo = judgment === "miss" ? 0 : state.combo + 1;
    const maxCombo = Math.max(state.maxCombo, newCombo);

    const beatEvent: BeatEvent = {
      beatIndex,
      timestamp: Date.now(),
      targetBrickIds,
      playerBrickIds,
      judgment,
      timingDelta,
      spectrumScore,
      rhythmScore,
      errors,
    };

    set({
      beatEvents: [...state.beatEvents, beatEvent],
      combo: newCombo,
      maxCombo,
      selectedBrickId: null,
    });
  },

  advanceBeat: () => {
    const state = get();
    if (state.currentBeat >= state.totalBeats - 1) {
      get().endGame();
      return;
    }
    set({ currentBeat: state.currentBeat + 1 });
  },

  setBeatEvents: (events: BeatEvent[]) => set({ beatEvents: events }),
}));
