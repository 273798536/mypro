import type {
  BuoyParameter,
  ManualOverride,
  NoiseFlag,
  RepairNote,
  AlarmRecord,
} from '@/types'

const TEN_MINUTES_MS = 10 * 60 * 1000

export function isNoteLinkedToOverride(
  note: RepairNote,
  override: ManualOverride,
): boolean {
  if (override.sourceNoteId && override.sourceNoteId === note.id) return true
  const overrideTs = new Date(override.timestamp).getTime()
  const noteTs = new Date(note.timestamp).getTime()
  if (Math.abs(overrideTs - noteTs) === 0) return true
  if (
    override.sourceNoteObject &&
    note.relatedObject &&
    override.sourceNoteObject === note.relatedObject &&
    Math.abs(overrideTs - noteTs) <= TEN_MINUTES_MS
  )
    return true
  return false
}

export function isNoteLinkedToNoise(
  note: RepairNote,
  noise: NoiseFlag,
): boolean {
  if (note.relatedParameterIds.includes(noise.parameterId)) return true
  const noiseTs = new Date(noise.timestamp).getTime()
  const noteTs = new Date(note.timestamp).getTime()
  if (Math.abs(noiseTs - noteTs) === 0) return true
  if (Math.abs(noiseTs - noteTs) <= TEN_MINUTES_MS) return true
  return false
}

export function isNoteLinkedToParameter(
  note: RepairNote,
  parameter: BuoyParameter,
): boolean {
  if (note.relatedParameterIds.includes(parameter.id)) return true
  return false
}

export function findNotesForOverride(
  notes: RepairNote[],
  override: ManualOverride,
): RepairNote[] {
  return notes.filter((n) => isNoteLinkedToOverride(n, override))
}

export function findNotesForNoise(
  notes: RepairNote[],
  noise: NoiseFlag,
): RepairNote[] {
  return notes.filter((n) => isNoteLinkedToNoise(n, noise))
}

export function findNotesForParameter(
  notes: RepairNote[],
  parameter: BuoyParameter,
): RepairNote[] {
  return notes.filter((n) => isNoteLinkedToParameter(n, parameter))
}

export function findOverridesForNote(
  overrides: ManualOverride[],
  note: RepairNote,
): ManualOverride[] {
  return overrides.filter((o) => isNoteLinkedToOverride(note, o))
}

export function findNoisesForNote(
  noises: NoiseFlag[],
  note: RepairNote,
): NoiseFlag[] {
  return noises.filter((nf) => isNoteLinkedToNoise(note, nf))
}

export function findAlarmsForOverride(
  alarms: AlarmRecord[],
  override: ManualOverride,
): AlarmRecord[] {
  return alarms.filter(
    (a) =>
      a.parameterName === override.parameterName &&
      a.timestamp === override.timestamp,
  )
}
