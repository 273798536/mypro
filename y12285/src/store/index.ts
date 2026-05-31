import { create } from 'zustand'

interface Musician {
  id: string
  name: string
  section: 'strings' | 'woodwinds' | 'brass' | 'percussion'
  position: { x: number; y: number; z: number }
  soundPressure: number
  instrument: string
  radiationAngle: number
  reportNote: string
}

interface AbsorptionMaterial {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  absorptionCoefficients: Record<string, number>
  missingFrequencies: string[]
}

interface OcclusionEvent {
  id: string
  sourceId: string
  targetId: string
  type: 'musician_block' | 'material_block' | 'position_offset'
  reason: string
  suggestion: string
  timestamp: number
}

interface AuditLogEntry {
  id: string
  timestamp: number
  action: string
  parameter: string
  oldValue: unknown
  newValue: unknown
  snapshotUrl?: string
}

interface StoreState {
  musicians: Musician[]
  materials: AbsorptionMaterial[]
  occlusions: OcclusionEvent[]
  auditLog: AuditLogEntry[]
  selectedMusicianId: string | null
  selectedMaterialId: string | null
  activeSections: string[]
  timeline: { currentTime: number; duration: number; isPlaying: boolean }
  screenshotPreview: string | null
  occlusionPanelOpen: boolean

  updateMusicianPosition: (id: string, pos: { x: number; y: number; z: number }) => void
  updateMusicianSoundPressure: (id: string, sp: number) => void
  updateMusicianReportNote: (id: string, note: string) => void
  setMusicians: (arr: Musician[]) => void
  updateMaterial: (id: string, partial: Partial<AbsorptionMaterial>) => void
  setOcclusions: (arr: OcclusionEvent[]) => void
  clearOcclusions: () => void
  addAuditEntry: (entry: AuditLogEntry) => void
  selectMusician: (id: string | null) => void
  selectMaterial: (id: string | null) => void
  toggleSection: (section: string) => void
  setAllSections: () => void
  setCurrentTime: (t: number) => void
  togglePlay: () => void
  setDuration: (d: number) => void
  setScreenshotPreview: (url: string | null) => void
  clearScreenshotPreview: () => void
  toggleOcclusionPanel: () => void
}

const ALL_SECTIONS = ['strings', 'woodwinds', 'brass', 'percussion']

export const useStore = create<StoreState>((set, get) => ({
  musicians: [],
  materials: [],
  occlusions: [],
  auditLog: [],
  selectedMusicianId: null,
  selectedMaterialId: null,
  activeSections: [...ALL_SECTIONS],
  timeline: { currentTime: 0, duration: 0, isPlaying: false },
  screenshotPreview: null,
  occlusionPanelOpen: false,

  updateMusicianPosition: (id, pos) => {
    const musician = get().musicians.find((m) => m.id === id)
    if (!musician) return
    get().addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'updateMusicianPosition',
      parameter: id,
      oldValue: musician.position,
      newValue: pos,
    })
    set((state) => ({
      musicians: state.musicians.map((m) =>
        m.id === id ? { ...m, position: pos } : m
      ),
    }))
  },

  updateMusicianSoundPressure: (id, sp) => {
    const musician = get().musicians.find((m) => m.id === id)
    if (!musician) return
    get().addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'updateMusicianSoundPressure',
      parameter: id,
      oldValue: musician.soundPressure,
      newValue: sp,
    })
    set((state) => ({
      musicians: state.musicians.map((m) =>
        m.id === id ? { ...m, soundPressure: sp } : m
      ),
    }))
  },

  updateMusicianReportNote: (id, note) => {
    const musician = get().musicians.find((m) => m.id === id)
    if (!musician) return
    get().addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'updateMusicianReportNote',
      parameter: id,
      oldValue: musician.reportNote,
      newValue: note,
    })
    set((state) => ({
      musicians: state.musicians.map((m) =>
        m.id === id ? { ...m, reportNote: note } : m
      ),
    }))
  },

  setMusicians: (arr) => {
    get().addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'setMusicians',
      parameter: 'musicians',
      oldValue: get().musicians,
      newValue: arr,
    })
    set({ musicians: arr })
  },

  updateMaterial: (id, partial) => {
    const material = get().materials.find((m) => m.id === id)
    if (!material) return
    get().addAuditEntry({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'updateMaterial',
      parameter: id,
      oldValue: material,
      newValue: { ...material, ...partial },
    })
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...partial } : m
      ),
    }))
  },

  setOcclusions: (arr) => set({ occlusions: arr }),
  clearOcclusions: () => set({ occlusions: [] }),

  addAuditEntry: (entry) =>
    set((state) => ({ auditLog: [...state.auditLog, entry] })),

  selectMusician: (id) => set({ selectedMusicianId: id }),
  selectMaterial: (id) => set({ selectedMaterialId: id }),

  toggleSection: (section) =>
    set((state) => ({
      activeSections: state.activeSections.includes(section)
        ? state.activeSections.filter((s) => s !== section)
        : [...state.activeSections, section],
    })),

  setAllSections: () => set({ activeSections: [...ALL_SECTIONS] }),

  setCurrentTime: (t) =>
    set((state) => ({ timeline: { ...state.timeline, currentTime: t } })),
  togglePlay: () =>
    set((state) => ({
      timeline: { ...state.timeline, isPlaying: !state.timeline.isPlaying },
    })),
  setDuration: (d) =>
    set((state) => ({ timeline: { ...state.timeline, duration: d } })),

  setScreenshotPreview: (url) => set({ screenshotPreview: url }),
  clearScreenshotPreview: () => set({ screenshotPreview: null }),

  toggleOcclusionPanel: () =>
    set((state) => ({ occlusionPanelOpen: !state.occlusionPanelOpen })),
}))
