import { create } from 'zustand'
import type { ParameterSnapshot, Note, SafetyThreshold, AnomalyRecord, ConsistencyCheck } from '@/types'
import { mockSnapshots, mockNotes, mockThresholds, mockAnomalies } from '@/data/mockData'

const DATA_VERSION = 'v1.1'
const STORAGE_KEYS = {
  version: 'replay-data-version',
  snapshots: 'replay-snapshots',
  notes: 'replay-notes',
  thresholds: 'replay-thresholds',
  anomalies: 'replay-anomalies',
  currentTs: 'replay-currentTs',
  lastRunId: 'replay-lastRunId',
  lastRunTs: 'replay-lastRunTs',
} as const

interface ReplayStore {
  snapshots: ParameterSnapshot[]
  notes: Note[]
  thresholds: SafetyThreshold[]
  anomalies: AnomalyRecord[]
  currentTimestamp: number
  selectedSnapshotId: string | null
  selectedNoteId: string | null
  selectedAnomalyId: string | null
  showImpactChain: boolean
  lastRunId: string
  lastRunTimestamp: number

  setCurrentTimestamp: (ts: number) => void
  selectSnapshot: (id: string | null) => void
  selectNote: (id: string | null) => void
  selectAnomaly: (id: string | null) => void
  setShowImpactChain: (show: boolean) => void
  rerun: () => void
  checkConsistency: () => ConsistencyCheck
  addNote: (note: Note) => void
  resetToDefault: () => void
  getSnapshotsAtTime: (ts: number) => ParameterSnapshot[]
  getNotesForSnapshot: (snapshotId: string) => Note[]
  getActiveThreshold: (parameterName: string, timestamp: number) => number | null
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch {}
  return fallback
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function isDataVersionValid(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.version) === DATA_VERSION
  } catch {
    return false
  }
}

function ensureVersion(): void {
  try {
    if (!isDataVersionValid()) {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(STORAGE_KEYS.version, DATA_VERSION)
    }
  } catch {}
}

ensureVersion()

export const useReplayStore = create<ReplayStore>((set, get) => ({
  snapshots: loadFromStorage(STORAGE_KEYS.snapshots, mockSnapshots),
  notes: loadFromStorage(STORAGE_KEYS.notes, mockNotes),
  thresholds: loadFromStorage(STORAGE_KEYS.thresholds, mockThresholds),
  anomalies: loadFromStorage(STORAGE_KEYS.anomalies, mockAnomalies),
  currentTimestamp: loadFromStorage(STORAGE_KEYS.currentTs, mockSnapshots[0]?.timestamp ?? Date.now()),
  selectedSnapshotId: null,
  selectedNoteId: null,
  selectedAnomalyId: null,
  showImpactChain: false,
  lastRunId: loadFromStorage(STORAGE_KEYS.lastRunId, generateRunId()),
  lastRunTimestamp: loadFromStorage(STORAGE_KEYS.lastRunTs, Date.now()),

  setCurrentTimestamp: (ts) => {
    set({ currentTimestamp: ts })
    saveToStorage(STORAGE_KEYS.currentTs, ts)
  },

  selectSnapshot: (id) => {
    set({ selectedSnapshotId: id })
    if (id) {
      const snap = get().snapshots.find((s) => s.id === id)
      if (snap) {
        set({ currentTimestamp: snap.timestamp })
        saveToStorage(STORAGE_KEYS.currentTs, snap.timestamp)
      }
    }
  },

  selectNote: (id) => set({ selectedNoteId: id }),

  selectAnomaly: (id) => set({ selectedAnomalyId: id }),

  setShowImpactChain: (show) => set({ showImpactChain: show }),

  rerun: () => {
    const newRunId = generateRunId()
    const newRunTs = Date.now()
    set({ lastRunId: newRunId, lastRunTimestamp: newRunTs })
    saveToStorage(STORAGE_KEYS.lastRunId, newRunId)
    saveToStorage(STORAGE_KEYS.lastRunTs, newRunTs)
  },

  checkConsistency: () => {
    const state = get()
    const mismatches: string[] = []

    const notesInSnapshot = state.notes.filter(
      (n) => state.snapshots.some((s) => s.id === n.snapshotId)
    )
    if (notesInSnapshot.length !== state.notes.length) {
      mismatches.push(
        `备注总数(${state.notes.length})与关联快照数(${notesInSnapshot.length})不一致`
      )
    }

    const anomaliesWithRefs = state.anomalies.filter(
      (a) => state.snapshots.some((s) => s.id === a.relatedSnapshotId)
    )
    if (anomaliesWithRefs.length !== state.anomalies.length) {
      mismatches.push(
        `异常记录数(${state.anomalies.length})与关联快照数(${anomaliesWithRefs.length})不一致`
      )
    }

    const retroNotes = state.notes.filter((n) => n.isRetrospective)
    const retroAnomalies = state.anomalies.filter((a) => a.type === 'note_correction')
    if (retroNotes.length !== retroAnomalies.length) {
      mismatches.push(
        `后补备注数(${retroNotes.length})与备注修正异常数(${retroAnomalies.length})不一致`
      )
    }

    return {
      isConsistent: mismatches.length === 0,
      noteCount: state.notes.length,
      anomalyCount: state.anomalies.length,
      snapshotCount: state.snapshots.length,
      mismatches,
    }
  },

  addNote: (note) => {
    const notes = [...get().notes, note]
    set({ notes })
    saveToStorage(STORAGE_KEYS.notes, notes)
  },

  resetToDefault: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
    localStorage.setItem(STORAGE_KEYS.version, DATA_VERSION)
    const newRunId = generateRunId()
    const newRunTs = Date.now()
    saveToStorage(STORAGE_KEYS.lastRunId, newRunId)
    saveToStorage(STORAGE_KEYS.lastRunTs, newRunTs)
    saveToStorage(STORAGE_KEYS.currentTs, mockSnapshots[0]?.timestamp ?? Date.now())
    saveToStorage(STORAGE_KEYS.snapshots, mockSnapshots)
    saveToStorage(STORAGE_KEYS.notes, mockNotes)
    saveToStorage(STORAGE_KEYS.thresholds, mockThresholds)
    saveToStorage(STORAGE_KEYS.anomalies, mockAnomalies)
    set({
      snapshots: mockSnapshots,
      notes: mockNotes,
      thresholds: mockThresholds,
      anomalies: mockAnomalies,
      currentTimestamp: mockSnapshots[0]?.timestamp ?? Date.now(),
      selectedSnapshotId: null,
      selectedNoteId: null,
      selectedAnomalyId: null,
      showImpactChain: false,
      lastRunId: newRunId,
      lastRunTimestamp: newRunTs,
    })
  },

  getSnapshotsAtTime: (ts) => {
    return get().snapshots.filter(
      (s) => Math.abs(s.timestamp - ts) < TEN_MIN / 2
    )
  },

  getNotesForSnapshot: (snapshotId) => {
    return get().notes.filter((n) => n.snapshotId === snapshotId)
  },

  getActiveThreshold: (parameterName, timestamp) => {
    const thresholds = get().thresholds
      .filter((t) => t.parameterName === parameterName)
      .sort((a, b) => a.changedAt - b.changedAt)

    let result: number | null = null
    for (const t of thresholds) {
      if (t.changedAt <= timestamp) {
        result = t.newValue
      }
    }
    return result
  },
}))

const TEN_MIN = 10 * 60 * 1000
