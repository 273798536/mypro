import { create } from 'zustand';
import { TrackData, GameStatus, JudgeRecord, VolumeRecord, InputEvent, GameResult } from '../types';
import { defaultTrack } from '../data/sampleTracks';
import { calculateGameResult, judgeTiming, GOOD_WINDOW } from '../utils/judgeUtils';

interface GameState {
  status: GameStatus;
  currentTime: number;
  currentTrack: TrackData;
  activeParts: string[];
  userVolumes: Record<string, number>;
  inputEvents: InputEvent[];
  judgeRecords: JudgeRecord[];
  volumeRecords: VolumeRecord[];
  judgedNoteIds: Set<string>;
  gameResult: GameResult | null;
  lastJudgeResult: JudgeRecord | null;
  
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  finishGame: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (partId: string, volume: number) => void;
  addInputEvent: (event: InputEvent) => void;
  addJudgeRecord: (record: JudgeRecord) => void;
  addVolumeRecord: (record: VolumeRecord) => void;
  markNoteAsJudged: (noteId: string) => void;
  setLastJudgeResult: (result: JudgeRecord | null) => void;
  handleNoteHit: (partId: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'idle',
  currentTime: 0,
  currentTrack: defaultTrack,
  activeParts: defaultTrack.parts.map(p => p.id),
  userVolumes: defaultTrack.parts.reduce((acc, p) => ({ ...acc, [p.id]: p.notes[0]?.volume || 60 }), {}),
  inputEvents: [],
  judgeRecords: [],
  volumeRecords: [],
  judgedNoteIds: new Set(),
  gameResult: null,
  lastJudgeResult: null,

  startGame: () => set({ 
    status: 'playing', 
    currentTime: 0,
    inputEvents: [],
    judgeRecords: [],
    volumeRecords: [],
    judgedNoteIds: new Set(),
    gameResult: null,
    lastJudgeResult: null,
  }),

  pauseGame: () => set({ status: 'paused' }),

  resumeGame: () => set({ status: 'playing' }),

  restartGame: () => set({ 
    status: 'idle', 
    currentTime: 0,
    inputEvents: [],
    judgeRecords: [],
    volumeRecords: [],
    judgedNoteIds: new Set(),
    gameResult: null,
    lastJudgeResult: null,
  }),

  finishGame: () => {
    const { judgeRecords, volumeRecords } = get();
    const result = calculateGameResult(judgeRecords, volumeRecords);
    set({ status: 'finished', gameResult: result });
  },

  setCurrentTime: (time: number) => set({ currentTime: time }),

  setVolume: (partId: string, volume: number) => set(state => ({
    userVolumes: { ...state.userVolumes, [partId]: Math.max(0, Math.min(100, volume)) }
  })),

  addInputEvent: (event: InputEvent) => set(state => ({
    inputEvents: [...state.inputEvents, event]
  })),

  addJudgeRecord: (record: JudgeRecord) => set(state => ({
    judgeRecords: [...state.judgeRecords, record]
  })),

  addVolumeRecord: (record: VolumeRecord) => set(state => ({
    volumeRecords: [...state.volumeRecords, record]
  })),

  markNoteAsJudged: (noteId: string) => set(state => {
    const newSet = new Set(state.judgedNoteIds);
    newSet.add(noteId);
    return { judgedNoteIds: newSet };
  }),

  setLastJudgeResult: (result: JudgeRecord | null) => set({ lastJudgeResult: result }),

  handleNoteHit: (partId: string) => {
    const state = get();
    if (state.status !== 'playing') return;

    const part = state.currentTrack.parts.find(p => p.id === partId);
    if (!part) return;

    const time = state.currentTime;
    const volume = state.userVolumes[partId] || 60;

    let closestNote = null;
    let closestDistance = Infinity;

    part.notes.forEach(note => {
      if (state.judgedNoteIds.has(note.id)) return;
      const distance = Math.abs(time - note.time);
      if (distance < closestDistance && distance <= GOOD_WINDOW) {
        closestDistance = distance;
        closestNote = note;
      }
    });

    if (closestNote) {
      const result = judgeTiming(time, closestNote.time);
      const offset = time - closestNote.time;
      const mainPart = state.currentTrack.parts.find(p => p.isMain);
      const mainVolume = mainPart ? state.userVolumes[mainPart.id] || 60 : 70;
      const volumeRatio = volume / (closestNote.volume || 60);

      const record = {
        noteId: closestNote.id,
        partId,
        partName: part.name,
        judgeTime: time,
        expectedTime: closestNote.time,
        result,
        offset,
        volumeRatio,
      };

      set(state => ({
        judgeRecords: [...state.judgeRecords, record],
        judgedNoteIds: new Set([...state.judgedNoteIds, closestNote.id]),
        lastJudgeResult: record,
      }));
    }
  },
}));
