
import { create } from 'zustand';
import { GameSession, GestureType, VoicePart, Grade } from '../types';
import {
  generateId,
  initializeVoiceStates,
  applyGesture,
  addRandomNoise,
  detectErrors,
  createDecisionStep,
  calculateSyncLevel,
  calculateFinalScore,
  calculateGrade,
} from '../utils/gameLogic';
import { saveSession } from '../utils/storage';

interface GameStore {
  session: GameSession | null;
  isPlaying: boolean;
  isPaused: boolean;
  selectedTarget: VoicePart | 'all';
  showAnimation: boolean;
  lastAction: string | null;

  startGame: (sceneName: string, totalRounds: number) => void;
  makeDecision: (gesture: GestureType) => void;
  nextRound: () => void;
  endGame: () => void;
  loadSession: (session: GameSession) => void;
  resetGame: () => void;
  setSelectedTarget: (target: VoicePart | 'all') => void;
  setShowAnimation: (show: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  isPlaying: false,
  isPaused: false,
  selectedTarget: 'all',
  showAnimation: false,
  lastAction: null,

  startGame: (sceneName: string, totalRounds: number) => {
    const initialVoices = initializeVoiceStates();
    const newSession: GameSession = {
      id: generateId(),
      startTime: Date.now(),
      status: 'playing',
      currentRound: 1,
      totalRounds,
      score: 70,
      grade: 'C' as Grade,
      voiceStates: initialVoices,
      decisions: [],
      errors: [],
      sceneName,
    };

    set({
      session: newSession,
      isPlaying: true,
      isPaused: false,
      selectedTarget: 'all',
    });

    saveSession(newSession);
  },

  makeDecision: (gesture: GestureType) => {
    const { session, selectedTarget } = get();
    if (!session || session.status !== 'playing') return;

    const decision = createDecisionStep(session.currentRound, gesture, selectedTarget, session.voiceStates);
    let newVoices = applyGesture(session.voiceStates, gesture, selectedTarget);
    newVoices = addRandomNoise(newVoices);

    const newErrors = detectErrors(newVoices, session.currentRound);
    const syncLevel = calculateSyncLevel(newVoices);
    const newScore = calculateFinalScore(
      70,
      syncLevel,
      [...session.errors, ...newErrors],
      [...session.decisions, decision]
    );
    const newGrade = calculateGrade(newScore);

    const updatedSession: GameSession = {
      ...session,
      voiceStates: newVoices,
      decisions: [...session.decisions, decision],
      errors: [...session.errors, ...newErrors],
      score: newScore,
      grade: newGrade,
    };

    set({
      session: updatedSession,
      showAnimation: true,
      lastAction: decision.description,
    });

    saveSession(updatedSession);

    setTimeout(() => {
      set({ showAnimation: false, lastAction: null });
    }, 1000);
  },

  nextRound: () => {
    const { session } = get();
    if (!session || session.status !== 'playing') return;

    const nextRound = session.currentRound + 1;

    if (nextRound > session.totalRounds) {
      get().endGame();
      return;
    }

    let newVoices = addRandomNoise(session.voiceStates);
    const newErrors = detectErrors(newVoices, nextRound);
    const syncLevel = calculateSyncLevel(newVoices);
    const newScore = calculateFinalScore(
      70,
      syncLevel,
      [...session.errors, ...newErrors],
      session.decisions
    );
    const newGrade = calculateGrade(newScore);

    const updatedSession: GameSession = {
      ...session,
      currentRound: nextRound,
      voiceStates: newVoices,
      errors: [...session.errors, ...newErrors],
      score: newScore,
      grade: newGrade,
    };

    set({ session: updatedSession });
    saveSession(updatedSession);
  },

  endGame: () => {
    const { session } = get();
    if (!session) return;

    const finalSession: GameSession = {
      ...session,
      endTime: Date.now(),
      status: 'completed',
    };

    set({
      session: finalSession,
      isPlaying: false,
    });

    saveSession(finalSession);
  },

  loadSession: (session: GameSession) => {
    set({
      session,
      isPlaying: session.status === 'playing',
      isPaused: false,
    });
  },

  resetGame: () => {
    set({
      session: null,
      isPlaying: false,
      isPaused: false,
      selectedTarget: 'all',
      showAnimation: false,
      lastAction: null,
    });
  },

  setSelectedTarget: (target: VoicePart | 'all') => {
    set({ selectedTarget: target });
  },

  setShowAnimation: (show: boolean) => {
    set({ showAnimation: show });
  },
}));

