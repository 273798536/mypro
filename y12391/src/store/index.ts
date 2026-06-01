import { create } from "zustand"
import type {
  WaveformSample,
  EnvelopeParams,
  VersionSnapshot,
  Anomaly,
  ClassroomQuestion,
  AnomalyType,
  AnomalyStatus,
} from "@/types"
import { PARAM_LIMITS, DEFAULT_ENVELOPE } from "@/types"

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function checkParamOutOfBounds(
  envelope: EnvelopeParams,
  versionId: string
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const keys = Object.keys(PARAM_LIMITS) as (keyof EnvelopeParams)[]
  for (const key of keys) {
    const limit = PARAM_LIMITS[key]
    if (envelope[key] > limit.max) {
      anomalies.push({
        id: uid(),
        type: "param_out_of_bounds",
        description: `${limit.label} 值 ${envelope[key].toFixed(3)}${limit.unit} 超出上限 ${limit.max}${limit.unit}`,
        versionId,
        paramKey: key,
        expectedRange: [limit.min, limit.max],
        actualValue: envelope[key],
        status: "pending",
        affectedDetailIds: [],
      })
    }
    if (envelope[key] < limit.min) {
      anomalies.push({
        id: uid(),
        type: "param_out_of_bounds",
        description: `${limit.label} 值 ${envelope[key].toFixed(3)}${limit.unit} 低于下限 ${limit.min}${limit.unit}`,
        versionId,
        paramKey: key,
        expectedRange: [limit.min, limit.max],
        actualValue: envelope[key],
        status: "pending",
        affectedDetailIds: [],
      })
    }
  }
  return anomalies
}

function generateSineWave(
  duration: number,
  frequency: number,
  sampleRate: number
): number[] {
  const length = Math.floor(duration * sampleRate)
  const data: number[] = []
  for (let i = 0; i < length; i++) {
    data.push(Math.sin((2 * Math.PI * frequency * i) / sampleRate))
  }
  return data
}

interface EnvelopeStore {
  samples: WaveformSample[]
  versions: VersionSnapshot[]
  anomalies: Anomaly[]
  questions: ClassroomQuestion[]
  currentVersionId: string | null
  currentSampleId: string | null
  editingEnvelope: EnvelopeParams

  addSample: (name: string, frequency?: number, duration?: number) => string
  updateEnvelope: (key: keyof EnvelopeParams, value: number) => void
  commitVersion: (label?: string) => string
  setCurrentVersion: (id: string) => void
  setCurrentSample: (id: string) => void
  confirmAnomaly: (id: string) => void
  rejectAnomaly: (id: string) => void
  addQuestion: (
    content: string,
    affectedVersionIds: string[],
    affectedParamKeys: (keyof EnvelopeParams)[],
    affectedAnomalyIds: string[]
  ) => string
  deleteQuestion: (id: string) => void
  getSampleById: (id: string) => WaveformSample | undefined
  getVersionById: (id: string) => VersionSnapshot | undefined
  getAnomaliesByVersion: (versionId: string) => Anomaly[]
  getQuestionsByVersion: (versionId: string) => ClassroomQuestion[]
  getPendingAnomalies: () => Anomaly[]
  loadFromStorage: () => void
  saveToStorage: () => void
  applyEnvelopeToSample: (
    sampleId: string,
    envelope: EnvelopeParams
  ) => number[]
}

export const useEnvelopeStore = create<EnvelopeStore>((set, get) => ({
  samples: [],
  versions: [],
  anomalies: [],
  questions: [],
  currentVersionId: null,
  currentSampleId: null,
  editingEnvelope: { ...DEFAULT_ENVELOPE },

  addSample: (name, frequency = 440, duration = 2) => {
    const sampleRate = 44100
    const data = generateSineWave(duration, frequency, sampleRate)
    const sample: WaveformSample = {
      id: uid(),
      name,
      data,
      sampleRate,
      duration,
      createdAt: Date.now(),
    }
    set((s) => ({ samples: [...s.samples, sample] }))
    get().saveToStorage()
    return sample.id
  },

  updateEnvelope: (key, value) => {
    set((s) => ({
      editingEnvelope: { ...s.editingEnvelope, [key]: value },
    }))
  },

  commitVersion: (label) => {
    const state = get()
    const sampleId = state.currentSampleId || state.samples[0]?.id
    if (!sampleId) return ""

    const id = uid()
    const envelope = { ...state.editingEnvelope }
    const version: VersionSnapshot = {
      id,
      sampleId,
      envelope,
      createdAt: Date.now(),
      label: label || `V${state.versions.length + 1}`,
      anomalyIds: [],
      questionIds: [],
    }

    const newAnomalies = checkParamOutOfBounds(envelope, id)
    const clippingAnomalies = detectClipping(sampleId, envelope, id, state)
    const allNewAnomalies = [...newAnomalies, ...clippingAnomalies]

    version.anomalyIds = allNewAnomalies.map((a) => a.id)

    set((s) => ({
      versions: [...s.versions, version],
      anomalies: [...s.anomalies, ...allNewAnomalies],
      currentVersionId: id,
    }))

    get().saveToStorage()
    return id
  },

  setCurrentVersion: (id) => {
    const state = get()
    const version = state.versions.find((v) => v.id === id)
    if (version) {
      set({
        currentVersionId: id,
        editingEnvelope: { ...version.envelope },
      })
    }
  },

  setCurrentSample: (id) => {
    set({ currentSampleId: id })
    const state = get()
    const latestVersion = [...state.versions]
      .reverse()
      .find((v) => v.sampleId === id)
    if (latestVersion) {
      set({
        currentVersionId: latestVersion.id,
        editingEnvelope: { ...latestVersion.envelope },
      })
    } else {
      set({
        currentVersionId: null,
        editingEnvelope: { ...DEFAULT_ENVELOPE },
      })
    }
  },

  confirmAnomaly: (id) => {
    set((s) => ({
      anomalies: s.anomalies.map((a) =>
        a.id === id
          ? { ...a, status: "confirmed" as AnomalyStatus, confirmedAt: Date.now() }
          : a
      ),
    }))
    get().saveToStorage()
  },

  rejectAnomaly: (id) => {
    const state = get()
    const anomaly = state.anomalies.find((a) => a.id === id)
    if (!anomaly) return

    set((s) => ({
      anomalies: s.anomalies.map((a) =>
        a.id === id
          ? { ...a, status: "rejected" as AnomalyStatus }
          : a
      ),
    }))

    if (anomaly.paramKey && anomaly.versionId) {
      const version = state.versions.find((v) => v.id === anomaly.versionId)
      if (version) {
        const prevVersion = [...state.versions]
          .filter((v) => v.sampleId === version.sampleId && v.createdAt < version.createdAt)
          .sort((a, b) => b.createdAt - a.createdAt)[0]

        if (prevVersion) {
          set((s) => ({
            editingEnvelope: { ...prevVersion.envelope },
          }))
        }
      }
    }

    get().saveToStorage()
  },

  addQuestion: (content, affectedVersionIds, affectedParamKeys, affectedAnomalyIds) => {
    const id = uid()
    const question: ClassroomQuestion = {
      id,
      content,
      createdAt: Date.now(),
      affectedVersionIds,
      affectedParamKeys,
      affectedAnomalyIds,
    }

    set((s) => ({
      questions: [...s.questions, question],
      versions: s.versions.map((v) =>
        affectedVersionIds.includes(v.id)
          ? { ...v, questionIds: [...v.questionIds, id] }
          : v
      ),
    }))

    get().saveToStorage()
    return id
  },

  deleteQuestion: (id) => {
    set((s) => ({
      questions: s.questions.filter((q) => q.id !== id),
      versions: s.versions.map((v) => ({
        ...v,
        questionIds: v.questionIds.filter((qid) => qid !== id),
      })),
    }))
    get().saveToStorage()
  },

  getSampleById: (id) => get().samples.find((s) => s.id === id),
  getVersionById: (id) => get().versions.find((v) => v.id === id),

  getAnomaliesByVersion: (versionId) =>
    get().anomalies.filter((a) => a.versionId === versionId),

  getQuestionsByVersion: (versionId) =>
    get().questions.filter((q) => q.affectedVersionIds.includes(versionId)),

  getPendingAnomalies: () => get().anomalies.filter((a) => a.status === "pending"),

  loadFromStorage: () => {
    try {
      const keys = [
        "synth-envelope:samples",
        "synth-envelope:versions",
        "synth-envelope:anomalies",
        "synth-envelope:questions",
      ] as const
      const [samples, versions, anomalies, questions] = keys.map((k) => {
        const raw = localStorage.getItem(k)
        return raw ? JSON.parse(raw) : []
      })

      const currentVersionId =
        versions.length > 0 ? versions[versions.length - 1].id : null
      const currentSampleId =
        samples.length > 0 ? samples[0].id : null
      const editingEnvelope =
        currentVersionId && versions.length > 0
          ? versions[versions.length - 1].envelope
          : { ...DEFAULT_ENVELOPE }

      set({
        samples,
        versions,
        anomalies,
        questions,
        currentVersionId,
        currentSampleId,
        editingEnvelope,
      })
    } catch {
      // storage corrupted, use defaults
    }
  },

  saveToStorage: () => {
    const state = get()
    try {
      localStorage.setItem(
        "synth-envelope:samples",
        JSON.stringify(state.samples)
      )
      localStorage.setItem(
        "synth-envelope:versions",
        JSON.stringify(state.versions)
      )
      localStorage.setItem(
        "synth-envelope:anomalies",
        JSON.stringify(state.anomalies)
      )
      localStorage.setItem(
        "synth-envelope:questions",
        JSON.stringify(state.questions)
      )
    } catch {
      // storage full
    }
  },

  applyEnvelopeToSample: (sampleId, envelope) => {
    const sample = get().samples.find((s) => s.id === sampleId)
    if (!sample) return []

    const sr = sample.sampleRate
    const totalDur = envelope.attack + envelope.decay + envelope.release + 0.5
    const totalSamples = Math.floor(totalDur * sr)
    const result: number[] = new Array(totalSamples).fill(0)

    const attackSamples = Math.floor(envelope.attack * sr)
    const decaySamples = Math.floor(envelope.decay * sr)
    const sustainDur = 0.5
    const sustainStart = attackSamples + decaySamples
    const sustainEnd = sustainStart + Math.floor(sustainDur * sr)
    const releaseStart = sustainEnd
    const releaseSamples = Math.floor(envelope.release * sr)

    for (let i = 0; i < totalSamples && i < sample.data.length; i++) {
      let envValue = 0
      if (i < attackSamples) {
        envValue = i / attackSamples
      } else if (i < attackSamples + decaySamples) {
        const decayProgress = (i - attackSamples) / decaySamples
        envValue = 1 - (1 - envelope.sustain) * decayProgress
      } else if (i < sustainEnd) {
        envValue = envelope.sustain
      } else if (i < releaseStart + releaseSamples) {
        const releaseProgress = (i - releaseStart) / releaseSamples
        envValue = envelope.sustain * (1 - releaseProgress)
      } else {
        envValue = 0
      }
      result[i] = sample.data[i] * envValue
    }

    return result
  },
}))

function detectClipping(
  sampleId: string,
  envelope: EnvelopeParams,
  versionId: string,
  state: EnvelopeStore
): Anomaly[] {
  const sample = state.samples.find((s) => s.id === sampleId)
  if (!sample) return []

  const anomalies: Anomaly[] = []
  const peakThreshold = 0.95

  const applied = applyEnvelopeSimple(sample.data, envelope, sample.sampleRate)
  const hasClipping = applied.some((v) => Math.abs(v) > peakThreshold)

  if (hasClipping) {
    anomalies.push({
      id: uid(),
      type: "audio_clipping",
      description: `应用包络后音频出现裁切，峰值超过 ${(peakThreshold * 100).toFixed(0)}%`,
      versionId,
      status: "pending",
      affectedDetailIds: [],
    })
  }

  const beatInterval = 0.5
  const totalEnvDur = envelope.attack + envelope.decay + envelope.release
  const remainder = totalEnvDur % beatInterval
  if (remainder > 0.05 && remainder < beatInterval - 0.05) {
    anomalies.push({
      id: uid(),
      type: "beat_misalignment",
      description: `包络总时长 ${totalEnvDur.toFixed(3)}s 未对齐节拍网格（${beatInterval}s间隔），偏差 ${remainder.toFixed(3)}s`,
      versionId,
      status: "pending",
      affectedDetailIds: [],
    })
  }

  return anomalies
}

function applyEnvelopeSimple(
  data: number[],
  envelope: EnvelopeParams,
  sr: number
): number[] {
  const totalDur = envelope.attack + envelope.decay + envelope.release + 0.5
  const totalSamples = Math.min(data.length, Math.floor(totalDur * sr))
  const result: number[] = new Array(totalSamples).fill(0)

  const attackSamples = Math.floor(envelope.attack * sr)
  const decaySamples = Math.floor(envelope.decay * sr)
  const sustainDur = 0.5
  const sustainStart = attackSamples + decaySamples
  const sustainEnd = sustainStart + Math.floor(sustainDur * sr)
  const releaseStart = sustainEnd
  const releaseSamples = Math.floor(envelope.release * sr)

  for (let i = 0; i < totalSamples; i++) {
    let envValue = 0
    if (i < attackSamples) {
      envValue = attackSamples > 0 ? i / attackSamples : 1
    } else if (i < attackSamples + decaySamples) {
      const decayProgress = (i - attackSamples) / decaySamples
      envValue = 1 - (1 - envelope.sustain) * decayProgress
    } else if (i < sustainEnd) {
      envValue = envelope.sustain
    } else if (i < releaseStart + releaseSamples) {
      const releaseProgress = (i - releaseStart) / releaseSamples
      envValue = envelope.sustain * (1 - releaseProgress)
    } else {
      envValue = 0
    }
    result[i] = data[i] * envValue
  }

  return result
}
