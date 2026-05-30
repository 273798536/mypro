import { create } from 'zustand'
import type {
  PlayState,
  JudgmentResult,
  ScoreReport,
  JudgmentCriteria,
  ActiveJudgment,
  ConflictItem,
  LevelData,
} from '../types'
import { detectConflicts } from '../data/levels'

interface VolumeReading {
  partTrackId: string
  volume: number
  tick: number
}

interface GameState {
  playState: PlayState
  currentTick: number
  currentTime: number
  activeTrackId: string | null
  judgments: JudgmentResult[]
  activeJudgments: ActiveJudgment[]
  volumeReadings: VolumeReading[]
  delayedEntryFlags: Record<string, boolean>
  restViolationFlags: Record<string, boolean>
  volumeImbalanceFlags: Record<string, boolean>
  conflicts: ConflictItem[]
  conflictsResolved: boolean
  scoreReport: ScoreReport | null
  level: LevelData | null

  setLevel: (level: LevelData) => void
  setPlayState: (state: PlayState) => void
  setCurrentTick: (tick: number) => void
  setCurrentTime: (time: number) => void
  setActiveTrack: (trackId: string | null) => void
  handleBeatInput: (partTrackId: string, inputTimeMs: number) => void
  addVolumeReading: (partTrackId: string, volume: number, tick: number) => void
  resolveConflicts: () => void
  calculateScore: () => void
  reset: () => void
}

function judgeTiming(
  offsetMs: number,
  criteria: JudgmentCriteria
): 'perfect' | 'early' | 'late' | 'miss' {
  const abs = Math.abs(offsetMs)
  if (abs <= criteria.perfectWindowMs) return 'perfect'
  if (offsetMs < 0 && abs <= criteria.earlyWindowMs) return 'early'
  if (offsetMs > 0 && abs <= criteria.lateWindowMs) return 'late'
  return 'miss'
}

export const useGameStore = create<GameState>((set, get) => ({
  playState: 'idle',
  currentTick: -1,
  currentTime: 0,
  activeTrackId: null,
  judgments: [],
  activeJudgments: [],
  volumeReadings: [],
  delayedEntryFlags: {},
  restViolationFlags: {},
  volumeImbalanceFlags: {},
  conflicts: [],
  conflictsResolved: false,
  scoreReport: null,
  level: null,

  setLevel: (level: LevelData) => {
    const conflicts = detectConflicts(level)
    set({
      level,
      conflicts,
      conflictsResolved: conflicts.length === 0,
    })
  },

  setPlayState: (playState: PlayState) => set({ playState }),

  setCurrentTick: (tick: number) => set({ currentTick: tick }),

  setCurrentTime: (time: number) => set({ currentTime: time }),

  setActiveTrack: (trackId: string | null) => set({ activeTrackId: trackId }),

  handleBeatInput: (partTrackId: string, inputTimeMs: number) => {
    const state = get()
    const level = state.level
    if (!level || state.playState !== 'playing') return

    const msPerBeat = 60000 / level.bpm
    const currentTick = state.currentTick
    if (currentTick < 0) return

    const targetTimeMs = currentTick * msPerBeat
    const offsetMs = inputTimeMs - targetTimeMs

    const beatLine = level.beatLines.find((b) => b.tick === currentTick)
    const track = level.partTracks.find((t) => t.id === partTrackId)
    if (!track || !beatLine) return

    const noteAtTick = track.notes.find((n) => n.tick === currentTick)
    if (!noteAtTick) return

    const judgment = judgeTiming(offsetMs, level.criteria)

    const isDelayedEntry = noteAtTick.isEntry && judgment === 'late'
    const isRestViolation = beatLine.isRest && judgment !== 'miss'
    const volume = 50 + Math.random() * 30
    const isVolumeImbalance = volume > 80

    const result: JudgmentResult = {
      tick: currentTick,
      beatLabel: beatLine.label,
      partTrackId,
      partTrackName: track.name,
      judgment,
      offsetMs,
      volume: Math.round(volume),
      isDelayedEntry,
      isRestViolation,
      isVolumeImbalance,
    }

    const activeJudgment: ActiveJudgment = {
      partTrackId,
      judgment,
      tick: currentTick,
      timestamp: Date.now(),
    }

    const newDelayedFlags = { ...state.delayedEntryFlags }
    if (isDelayedEntry) newDelayedFlags[partTrackId] = true

    const newRestFlags = { ...state.restViolationFlags }
    const restKey = `${partTrackId}-${currentTick}`
    if (isRestViolation) newRestFlags[restKey] = true

    const newVolFlags = { ...state.volumeImbalanceFlags }
    if (isVolumeImbalance) newVolFlags[`${partTrackId}-${currentTick}`] = true

    set({
      judgments: [...state.judgments, result],
      activeJudgments: [...state.activeJudgments, activeJudgment],
      delayedEntryFlags: newDelayedFlags,
      restViolationFlags: newRestFlags,
      volumeImbalanceFlags: newVolFlags,
    })

    setTimeout(() => {
      const currentState = get()
      set({
        activeJudgments: currentState.activeJudgments.filter(
          (j) => j.timestamp !== activeJudgment.timestamp
        ),
      })
    }, 500)
  },

  addVolumeReading: (partTrackId: string, volume: number, tick: number) => {
    set((state) => ({
      volumeReadings: [...state.volumeReadings, { partTrackId, volume, tick }],
    }))
  },

  resolveConflicts: () => set({ conflictsResolved: true }),

  calculateScore: () => {
    const state = get()
    const level = state.level
    if (!level) return

    const judgments = state.judgments
    const summary = {
      totalNotes: judgments.length,
      perfectCount: judgments.filter((j) => j.judgment === 'perfect').length,
      earlyCount: judgments.filter((j) => j.judgment === 'early').length,
      lateCount: judgments.filter((j) => j.judgment === 'late').length,
      missCount: judgments.filter((j) => j.judgment === 'miss').length,
      delayedEntryCount: judgments.filter((j) => j.isDelayedEntry).length,
      restViolationCount: judgments.filter((j) => j.isRestViolation).length,
      volumeImbalanceCount: judgments.filter((j) => j.isVolumeImbalance).length,
    }

    const report: ScoreReport = {
      levelId: level.id,
      levelName: level.name,
      timestamp: new Date().toISOString(),
      judgments,
      criteria: level.criteria,
      summary,
    }

    set({ scoreReport: report, playState: 'finished' })
  },

  reset: () =>
    set({
      playState: 'idle',
      currentTick: -1,
      currentTime: 0,
      activeTrackId: null,
      judgments: [],
      activeJudgments: [],
      volumeReadings: [],
      delayedEntryFlags: {},
      restViolationFlags: {},
      volumeImbalanceFlags: {},
      scoreReport: null,
      conflictsResolved: false,
    }),
}))
