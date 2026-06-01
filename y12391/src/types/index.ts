export interface WaveformSample {
  id: string
  name: string
  data: number[]
  sampleRate: number
  duration: number
  createdAt: number
}

export interface EnvelopeParams {
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface VersionSnapshot {
  id: string
  sampleId: string
  envelope: EnvelopeParams
  createdAt: number
  label: string
  anomalyIds: string[]
  questionIds: string[]
}

export type AnomalyType = "param_out_of_bounds" | "audio_clipping" | "beat_misalignment"
export type AnomalyStatus = "pending" | "confirmed" | "rejected"

export interface Anomaly {
  id: string
  type: AnomalyType
  description: string
  versionId: string
  paramKey?: keyof EnvelopeParams
  expectedRange?: [number, number]
  actualValue?: number
  status: AnomalyStatus
  confirmedAt?: number
  affectedDetailIds: string[]
}

export interface ClassroomQuestion {
  id: string
  content: string
  createdAt: number
  affectedVersionIds: string[]
  affectedParamKeys: (keyof EnvelopeParams)[]
  affectedAnomalyIds: string[]
}

export const PARAM_LIMITS: Record<keyof EnvelopeParams, { min: number; max: number; step: number; unit: string; label: string }> = {
  attack: { min: 0.001, max: 5, step: 0.001, unit: "s", label: "Attack" },
  decay: { min: 0.001, max: 5, step: 0.001, unit: "s", label: "Decay" },
  sustain: { min: 0, max: 1, step: 0.01, unit: "", label: "Sustain" },
  release: { min: 0.001, max: 10, step: 0.001, unit: "s", label: "Release" },
}

export const DEFAULT_ENVELOPE: EnvelopeParams = {
  attack: 0.01,
  decay: 0.2,
  sustain: 0.7,
  release: 0.3,
}

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  param_out_of_bounds: "参数越界",
  audio_clipping: "音频裁切",
  beat_misalignment: "节拍错位",
}

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  param_out_of_bounds: "#ff4444",
  audio_clipping: "#ff8800",
  beat_misalignment: "#ffcc00",
}
