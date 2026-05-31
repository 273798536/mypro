import { create } from 'zustand';
import type {
  BeatNote,
  TrackSwitch,
  JudgmentRecord,
  ConflictDetail,
  TimedEvent,
  GamePhase,
  ScoreExport,
  ScoreMapping,
  ErrorDeduction,
} from '@/types';
import { generateBeatMap } from '@/engine/beatGenerator';
import { createJudgment, resetJudgmentIds } from '@/engine/judgment';
import { processSwitchDeliveries, applySwitchToNotes } from '@/engine/trackSwitcher';

interface JudgmentPopup {
  result: 'perfect' | 'great' | 'good' | 'miss';
  trackIndex: number;
  timestamp: number;
}

interface GameState {
  phase: GamePhase;
  notes: BeatNote[];
  switches: TrackSwitch[];
  judgments: JudgmentRecord[];
  conflicts: ConflictDetail[];
  events: TimedEvent[];
  errorDeductions: ErrorDeduction[];
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  startTime: number;
  elapsedTime: number;
  currentBpm: number;
  judgmentPopup: JudgmentPopup | null;
  activeTrackKeys: Set<number>;
  pendingComboMisjudge: boolean;
  prevBpm: number;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  updateTick: (currentTime: number) => void;
  handleKeyPress: (trackIndex: number, currentTime: number) => void;
  handleTrackActive: (trackIndex: number) => void;
  handleTrackInactive: (trackIndex: number) => void;
  exportScore: () => ScoreExport;
  getMapping: () => ScoreMapping[];
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  notes: [],
  switches: [],
  judgments: [],
  conflicts: [],
  events: [],
  errorDeductions: [],
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  greatCount: 0,
  goodCount: 0,
  missCount: 0,
  startTime: 0,
  elapsedTime: 0,
  currentBpm: 120,
  judgmentPopup: null,
  activeTrackKeys: new Set(),
  pendingComboMisjudge: false,
  prevBpm: 120,

  startGame: () => {
    const { notes, switches } = generateBeatMap();
    resetJudgmentIds();
    set({
      phase: 'playing',
      notes,
      switches,
      judgments: [],
      conflicts: [],
      events: [],
      errorDeductions: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
      startTime: performance.now(),
      elapsedTime: 0,
      currentBpm: 120,
      judgmentPopup: null,
      activeTrackKeys: new Set(),
      pendingComboMisjudge: false,
      prevBpm: 120,
    });
  },

  pauseGame: () => {
    if (get().phase === 'playing') {
      set({ phase: 'paused' });
    }
  },

  resumeGame: () => {
    if (get().phase === 'paused') {
      const elapsed = get().elapsedTime;
      set({
        phase: 'playing',
        startTime: performance.now() - elapsed,
      });
    }
  },

  restartGame: () => {
    get().startGame();
  },

  updateTick: (currentTime: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const elapsed = currentTime - state.startTime;
    set({ elapsedTime: elapsed });

    const { delivered, events: switchEvents } = processSwitchDeliveries(
      state.switches,
      elapsed
    );

    if (delivered.length > 0 || switchEvents.length > 0) {
      const newSwitches = [...state.switches];
      const allEvents = [...state.events, ...switchEvents];

      for (const sw of delivered) {
        const { deduction } = applySwitchToNotes(state.notes, sw);
        if (deduction) {
          for (const note of state.notes) {
            if (!note.judged && note.trackIndex === sw.toTrack) {
              // switch delay affected this note
            }
          }
        }
      }

      set({
        switches: newSwitches,
        events: allEvents,
      });
    }

    const missThreshold = 200;
    const missedNotes = state.notes.filter(
      (n) => !n.judged && elapsed - n.targetTime > missThreshold
    );

    if (missedNotes.length > 0) {
      const newJudgments: JudgmentRecord[] = [];
      const newConflicts: ConflictDetail[] = [];
      const newEvents: TimedEvent[] = [];
      const newDeductions: ErrorDeduction[] = [];
      let combo = state.combo;
      let maxCombo = state.maxCombo;
      let missCount = state.missCount;

      for (const note of missedNotes) {
        note.judged = true;
        const jdg = createJudgment(
          note,
          elapsed - note.targetTime,
          combo,
          state.pendingComboMisjudge,
          state.prevBpm
        );

        combo = 0;
        missCount++;

        newJudgments.push(jdg);
        newConflicts.push(...jdg.conflictDetails);
        newEvents.push(...jdg.events);
        newDeductions.push(...jdg.errorDeductions);
      }

      set((s) => ({
        judgments: [...s.judgments, ...newJudgments],
        conflicts: [...s.conflicts, ...newConflicts],
        events: [...s.events, ...newEvents],
        errorDeductions: [...s.errorDeductions, ...newDeductions],
        combo: 0,
        maxCombo,
        missCount,
        pendingComboMisjudge: missedNotes.some((n) => n.isSyncopation),
      }));
    }

    const lastNote = state.notes[state.notes.length - 1];
    if (lastNote && elapsed > lastNote.targetTime + 2000) {
      set({ phase: 'ended' });
    }
  },

  handleKeyPress: (trackIndex: number, currentTime: number) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const elapsed = currentTime - state.startTime;

    const candidates = state.notes.filter(
      (n) => !n.judged && n.trackIndex === trackIndex
    );

    if (candidates.length === 0) return;

    let closest = candidates[0];
    let minDev = Math.abs(elapsed - closest.targetTime);
    for (let i = 1; i < candidates.length; i++) {
      const dev = Math.abs(elapsed - candidates[i].targetTime);
      if (dev < minDev) {
        minDev = dev;
        closest = candidates[i];
      }
    }

    if (minDev > 200) return;

    closest.judged = true;

    const prevBpm = state.prevBpm;
    const jdg = createJudgment(
      closest,
      elapsed - closest.targetTime,
      state.combo,
      state.pendingComboMisjudge,
      prevBpm
    );

    const newCombo = jdg.result !== 'miss' ? state.combo + 1 : 0;
    const newMaxCombo = Math.max(state.maxCombo, newCombo);

    const isSpeedChange = Math.abs(closest.bpm - prevBpm) > prevBpm * 0.1;
    const newPendingMisjudge =
      closest.isSyncopation && jdg.result === 'miss' && isSpeedChange;

    set((s) => ({
      judgments: [...s.judgments, jdg],
      conflicts: [...s.conflicts, ...jdg.conflictDetails],
      events: [...s.events, ...jdg.events],
      errorDeductions: [...s.errorDeductions, ...jdg.errorDeductions],
      score: s.score + jdg.scoreChange,
      combo: newCombo,
      maxCombo: newMaxCombo,
      perfectCount: s.perfectCount + (jdg.result === 'perfect' ? 1 : 0),
      greatCount: s.greatCount + (jdg.result === 'great' ? 1 : 0),
      goodCount: s.goodCount + (jdg.result === 'good' ? 1 : 0),
      missCount: s.missCount + (jdg.result === 'miss' ? 1 : 0),
      currentBpm: closest.bpm,
      prevBpm: closest.bpm,
      judgmentPopup: {
        result: jdg.result,
        trackIndex,
        timestamp: currentTime,
      },
      pendingComboMisjudge: newPendingMisjudge,
    }));

    setTimeout(() => {
      const s = get();
      if (s.judgmentPopup && s.judgmentPopup.timestamp === currentTime) {
        set({ judgmentPopup: null });
      }
    }, 500);
  },

  handleTrackActive: (trackIndex: number) => {
    set((s) => {
      const newSet = new Set(s.activeTrackKeys);
      newSet.add(trackIndex);
      return { activeTrackKeys: newSet };
    });
  },

  handleTrackInactive: (trackIndex: number) => {
    set((s) => {
      const newSet = new Set(s.activeTrackKeys);
      newSet.delete(trackIndex);
      return { activeTrackKeys: newSet };
    });
  },

  exportScore: () => {
    const state = get();
    const mapping = state.judgments.map((j) => ({
      beatTrackId: j.sources.beatTrack.noteId,
      trainId: j.sources.train.trainId,
      platformId: j.sources.platform.platformId,
      judgmentId: j.id,
      scoreRecordId: `score_${j.id}`,
    }));

    return {
      sessionId: `session_${Date.now()}`,
      totalScore: state.score,
      maxCombo: state.maxCombo,
      perfectCount: state.perfectCount,
      greatCount: state.greatCount,
      goodCount: state.goodCount,
      missCount: state.missCount,
      judgments: state.judgments,
      conflicts: state.conflicts,
      events: state.events,
      mapping,
    };
  },

  getMapping: () => {
    const state = get();
    return state.judgments.map((j) => ({
      beatTrackId: j.sources.beatTrack.noteId,
      trainId: j.sources.train.trainId,
      platformId: j.sources.platform.platformId,
      judgmentId: j.id,
      scoreRecordId: `score_${j.id}`,
    }));
  },
}));
