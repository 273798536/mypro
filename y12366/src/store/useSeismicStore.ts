import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AccelerationRecord,
  DisplacementRecord,
  DamagePhoto,
  AlignmentResult,
  PeakExtraction,
  ConflictEntry,
  TraceLink,
  PlaybackState,
  PlaybackSpeed,
} from '@/types'

interface SeismicState {
  accelerationData: AccelerationRecord[]
  displacementData: DisplacementRecord[]
  damagePhotos: DamagePhoto[]
  alignmentResult: AlignmentResult | null
  peakExtractions: PeakExtraction[]
  conflicts: ConflictEntry[]
  traceLinks: TraceLink[]
  playback: PlaybackState
  displacementConclusion: string
  dataLoaded: boolean

  setAccelerationData: (data: AccelerationRecord[]) => void
  setDisplacementData: (data: DisplacementRecord[]) => void
  setDamagePhotos: (photos: DamagePhoto[]) => void
  runAlignment: () => void
  runPeakExtraction: () => void
  detectConflicts: () => void
  setPlayback: (partial: Partial<PlaybackState>) => void
  togglePlayback: () => void
  updateConflictJudgment: (id: string, judgment: string) => void
  updateConflictSeverity: (id: string, severity: 'high' | 'medium' | 'low') => void
  setDisplacementConclusion: (conclusion: string) => void
  generateTraceLinks: () => void
  loadSampleData: () => void
  resetAll: () => void
  updateAlignmentOffset: (channel: 'accelOffset' | 'dispOffset' | 'photoOffset', value: number) => void
}

function generateSampleAcceleration(): AccelerationRecord[] {
  const data: AccelerationRecord[] = []
  const startTime = Date.now()
  for (let i = 0; i < 500; i++) {
    const t = startTime + i * 20
    const phase = i / 500
    let value = 0
    if (phase < 0.1) {
      value = Math.sin(i * 0.3) * 0.5
    } else if (phase < 0.4) {
      value = Math.sin(i * 0.3) * (2 + Math.sin(i * 0.05) * 1.5)
    } else if (phase < 0.6) {
      value = Math.sin(i * 0.3) * (1.5 + Math.random() * 0.5)
    } else {
      value = Math.sin(i * 0.3) * 0.3 * Math.exp(-(i - 300) * 0.01)
    }
    const saturated = Math.abs(value) > 3.5
    data.push({ timestamp: t, value: saturated ? Math.sign(value) * 3.8 : value, saturated })
  }
  return data
}

function generateSampleDisplacement(): DisplacementRecord[] {
  const data: DisplacementRecord[] = []
  const startTime = Date.now() + 150
  for (let i = 0; i < 500; i++) {
    const t = startTime + i * 20
    const phase = i / 500
    let value = 0
    if (phase < 0.1) {
      value = Math.sin(i * 0.2) * 2
    } else if (phase < 0.4) {
      value = Math.sin(i * 0.2) * (8 + Math.sin(i * 0.03) * 4)
    } else if (phase < 0.6) {
      value = Math.sin(i * 0.2) * (5 + Math.random())
    } else {
      value = Math.sin(i * 0.2) * 1.5 * Math.exp(-(i - 300) * 0.008)
    }
    data.push({ timestamp: t, value })
  }
  return data
}

function generateSamplePhotos(): DamagePhoto[] {
  const startTime = Date.now()
  const stages = ['初始', '微裂缝', '裂缝扩展', '混凝土剥落', '钢筋屈服', '严重破坏', '残余变形']
  const photos: DamagePhoto[] = []
  for (let i = 0; i < 7; i++) {
    const missingPhase = i === 3 || i === 5
    photos.push({
      id: `photo-${i}`,
      timestamp: missingPhase ? null : startTime + i * 1400,
      imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=structural+damage+earthquake+testing+stage+${i + 1}+concrete+crack+reinforced+concrete+building+laboratory&image_size=landscape_16_9`,
      stage: stages[i],
      missingPhase,
    })
  }
  return photos
}

function detectPeaks(data: { timestamp: number; value: number }[], channel: 'acceleration' | 'displacement', alignmentId: string, saturatedFlags?: boolean[]): PeakExtraction[] {
  const peaks: PeakExtraction[] = []
  if (data.length < 3) return peaks
  let peakId = 0
  for (let i = 1; i < data.length - 1; i++) {
    const prev = Math.abs(data[i - 1].value)
    const curr = Math.abs(data[i].value)
    const next = Math.abs(data[i + 1].value)
    if (curr > prev && curr > next && curr > (channel === 'acceleration' ? 1.0 : 3.0)) {
      peaks.push({
        id: `peak-${channel}-${peakId++}`,
        alignmentId,
        timestamp: data[i].timestamp,
        value: data[i].value,
        channel,
        saturated: saturatedFlags?.[i] ?? false,
      })
    }
  }
  return peaks
}

export const useSeismicStore = create<SeismicState>()(
  persist(
    (set, get) => ({
  accelerationData: [],
  displacementData: [],
  damagePhotos: [],
  alignmentResult: null,
  peakExtractions: [],
  conflicts: [],
  traceLinks: [],
  playback: {
    isPlaying: false,
    currentTime: 0,
    speed: 1,
    startTime: 0,
    endTime: 0,
  },
  displacementConclusion: '',
  dataLoaded: false,

  setAccelerationData: (data) => set({ accelerationData: data }),
  setDisplacementData: (data) => set({ displacementData: data }),
  setDamagePhotos: (photos) => set({ damagePhotos: photos }),

  runAlignment: () => {
    const { accelerationData, displacementData, damagePhotos } = get()
    if (accelerationData.length === 0) return

    const accelStart = accelerationData[0]?.timestamp ?? 0
    const dispStart = displacementData[0]?.timestamp ?? 0
    const photoTimestamps = damagePhotos.filter(p => p.timestamp !== null).map(p => p.timestamp!)
    const photoStart = photoTimestamps.length > 0 ? Math.min(...photoTimestamps) : 0

    const driftMs = dispStart - accelStart
    const alignment: AlignmentResult = {
      id: `align-${Date.now()}`,
      driftMs,
      method: 'auto',
      createdAt: new Date().toISOString(),
      accelOffset: 0,
      dispOffset: -driftMs,
      photoOffset: photoStart - accelStart,
    }

    const allTimestamps = [
      ...accelerationData.map(d => d.timestamp),
      ...displacementData.map(d => d.timestamp),
    ]
    const minT = Math.min(...allTimestamps)
    const maxT = Math.max(...allTimestamps)

    set({
      alignmentResult: alignment,
      playback: {
        ...get().playback,
        startTime: minT,
        endTime: maxT,
        currentTime: minT,
      },
    })

    get().runPeakExtraction()
    get().detectConflicts()
  },

  runPeakExtraction: () => {
    const { accelerationData, displacementData, alignmentResult } = get()
    if (!alignmentResult) return

    const accelPeaks = detectPeaks(accelerationData, 'acceleration', alignmentResult.id, accelerationData.map(d => d.saturated))
    const dispPeaks = detectPeaks(displacementData, 'displacement', alignmentResult.id)

    set({ peakExtractions: [...accelPeaks, ...dispPeaks] })
  },

  detectConflicts: () => {
    const { accelerationData, damagePhotos, alignmentResult } = get()
    if (!alignmentResult) return

    const conflicts: ConflictEntry[] = []
    let seq = 0

    if (Math.abs(alignmentResult.driftMs) > 100) {
      conflicts.push({
        id: `conflict-${seq}`,
        type: 'timestamp_drift',
        severity: Math.abs(alignmentResult.driftMs) > 500 ? 'high' : 'medium',
        description: `位移记录与加速度序列存在 ${alignmentResult.driftMs}ms 时间戳漂移`,
        relatedSourceIds: ['acceleration', 'displacement'],
        judgment: '',
        judgmentAt: '',
        sequenceOrder: seq++,
        timestamp: alignmentResult.driftMs,
      })
    }

    const missingPhotos = damagePhotos.filter(p => p.missingPhase)
    missingPhotos.forEach((photo, idx) => {
      conflicts.push({
        id: `conflict-${seq}`,
        type: 'photo_missing',
        severity: 'medium',
        description: `损伤照片缺失"${photo.stage}"阶段记录`,
        relatedSourceIds: [photo.id],
        judgment: '',
        judgmentAt: '',
        sequenceOrder: seq++,
        timestamp: photo.timestamp ?? 0,
      })
    })

    const saturatedPoints = accelerationData.filter(d => d.saturated)
    if (saturatedPoints.length > 0) {
      const firstSat = saturatedPoints[0]
      const lastSat = saturatedPoints[saturatedPoints.length - 1]
      conflicts.push({
        id: `conflict-${seq}`,
        type: 'sensor_saturated_late',
        severity: 'high',
        description: `传感器饱和${saturatedPoints.length}个采样点，范围 [${new Date(firstSat.timestamp).toISOString()} - ${new Date(lastSat.timestamp).toISOString()}]`,
        relatedSourceIds: saturatedPoints.map(d => `accel-${d.timestamp}`),
        judgment: '',
        judgmentAt: '',
        sequenceOrder: seq++,
        timestamp: firstSat.timestamp,
      })
    }

    const driftConflict = conflicts.find(c => c.type === 'timestamp_drift')
    const photoConflict = conflicts.find(c => c.type === 'photo_missing')
    const satConflict = conflicts.find(c => c.type === 'sensor_saturated_late')
    if (driftConflict && photoConflict && satConflict) {
      conflicts.sort((a, b) => a.timestamp - b.timestamp)
      conflicts.forEach((c, i) => { c.sequenceOrder = i })
    }

    set({ conflicts })
    get().generateTraceLinks()
  },

  setPlayback: (partial) => set({ playback: { ...get().playback, ...partial } }),
  togglePlayback: () => set({ playback: { ...get().playback, isPlaying: !get().playback.isPlaying } }),

  updateConflictJudgment: (id, judgment) => {
    set({
      conflicts: get().conflicts.map(c =>
        c.id === id ? { ...c, judgment, judgmentAt: new Date().toISOString() } : c
      ),
    })
  },

  updateConflictSeverity: (id, severity) => {
    set({
      conflicts: get().conflicts.map(c =>
        c.id === id ? { ...c, severity } : c
      ),
    })
  },

  setDisplacementConclusion: (conclusion) => set({ displacementConclusion: conclusion }),

  generateTraceLinks: () => {
    const { alignmentResult, peakExtractions, damagePhotos, conflicts } = get()
    if (!alignmentResult) return

    const links: TraceLink[] = peakExtractions.map((peak, idx) => ({
      resultId: `result-${idx}`,
      alignment: alignmentResult,
      peakExtraction: peak,
      damageAssociation: damagePhotos.filter(p =>
        p.timestamp !== null && Math.abs(p.timestamp - peak.timestamp) < 2000
      ),
      conflicts: conflicts.filter(c =>
        Math.abs(c.timestamp - peak.timestamp) < 3000
      ),
    }))

    set({ traceLinks: links, dataLoaded: true })
  },

  loadSampleData: () => {
    const accel = generateSampleAcceleration()
    const disp = generateSampleDisplacement()
    const photos = generateSamplePhotos()

    set({
      accelerationData: accel,
      displacementData: disp,
      damagePhotos: photos,
      dataLoaded: false,
    })
    get().runAlignment()
  },

  resetAll: () => {
    set({
      accelerationData: [],
      displacementData: [],
      damagePhotos: [],
      alignmentResult: null,
      peakExtractions: [],
      conflicts: [],
      traceLinks: [],
      playback: {
        isPlaying: false,
        currentTime: 0,
        speed: 1,
        startTime: 0,
        endTime: 0,
      },
      displacementConclusion: '',
      dataLoaded: false,
    })
    try {
      localStorage.removeItem('seismic-store')
    } catch {
      // ignore
    }
  },

  updateAlignmentOffset: (channel, value) => {
    const { alignmentResult } = get()
    if (!alignmentResult) return
    set({
      alignmentResult: { ...alignmentResult, [channel]: value, method: 'manual' },
    })
    get().runPeakExtraction()
    get().detectConflicts()
  },
}),
    {
      name: 'seismic-store',
      version: 1,
      partialize: (state) => ({
        accelerationData: state.accelerationData,
        displacementData: state.displacementData,
        damagePhotos: state.damagePhotos,
        alignmentResult: state.alignmentResult,
        peakExtractions: state.peakExtractions,
        conflicts: state.conflicts,
        traceLinks: state.traceLinks,
        displacementConclusion: state.displacementConclusion,
        dataLoaded: state.dataLoaded,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!Array.isArray(state.accelerationData)) state.accelerationData = []
          if (!Array.isArray(state.displacementData)) state.displacementData = []
          if (!Array.isArray(state.damagePhotos)) state.damagePhotos = []
          if (!Array.isArray(state.peakExtractions)) state.peakExtractions = []
          if (!Array.isArray(state.conflicts)) state.conflicts = []
          if (!Array.isArray(state.traceLinks)) state.traceLinks = []
          if (typeof state.displacementConclusion !== 'string') state.displacementConclusion = ''
          if (typeof state.dataLoaded !== 'boolean') state.dataLoaded = false
          if (!state.playback) {
            state.playback = {
              isPlaying: false,
              currentTime: 0,
              speed: 1,
              startTime: 0,
              endTime: 0,
            }
          }
        }
      },
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          return {
            accelerationData: [],
            displacementData: [],
            damagePhotos: [],
            alignmentResult: null,
            peakExtractions: [],
            conflicts: [],
            traceLinks: [],
            displacementConclusion: '',
            dataLoaded: false,
            playback: {
              isPlaying: false,
              currentTime: 0,
              speed: 1,
              startTime: 0,
              endTime: 0,
            },
          }
        }
        return persistedState as SeismicState
      },
    }
  )
)

