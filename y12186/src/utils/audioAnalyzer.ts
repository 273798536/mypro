import type { CleanedRow, BreathingPoint, SilenceSegment, MelodyPoint } from "@/types"

const SILENCE_THRESHOLD = 0.02
const MIN_SILENCE_DURATION = 0.15
const BREATHING_CONFIDENCE_THRESHOLD = 0.6
const MISJUDGMENT_DURATION_MIN = 0.05
const MISJUDGMENT_DURATION_MAX = 0.12

export function analyzeMelodyLine(rows: CleanedRow[]): MelodyPoint[] {
  return rows.map((r) => ({
    timestamp: r.timestamp,
    pitch: r.pitch,
  }))
}

export function detectSilenceSegments(rows: CleanedRow[]): SilenceSegment[] {
  const segments: SilenceSegment[] = []
  let silenceStart: number | null = null
  let segId = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row.amplitude < SILENCE_THRESHOLD) {
      if (silenceStart === null) {
        silenceStart = row.timestamp
      }
    } else {
      if (silenceStart !== null) {
        const duration = row.timestamp - silenceStart
        if (duration >= MIN_SILENCE_DURATION) {
          const isMisjudgment = duration > MISJUDGMENT_DURATION_MIN && duration < MISJUDGMENT_DURATION_MAX
          segments.push({
            id: `sil-${segId++}`,
            startTimestamp: silenceStart,
            endTimestamp: row.timestamp,
            duration,
            isMisjudgment,
            misjudgmentReason: isMisjudgment ? "静音段过短，疑似误判" : undefined,
            reviewed: false,
          })
        }
        silenceStart = null
      }
    }
  }

  if (silenceStart !== null) {
    const lastTs = rows[rows.length - 1]?.timestamp ?? silenceStart
    const duration = lastTs - silenceStart
    if (duration >= MIN_SILENCE_DURATION) {
      const isMisjudgment = duration > MISJUDGMENT_DURATION_MIN && duration < MISJUDGMENT_DURATION_MAX
      segments.push({
        id: `sil-${segId++}`,
        startTimestamp: silenceStart,
        endTimestamp: lastTs,
        duration,
        isMisjudgment,
        misjudgmentReason: isMisjudgment ? "静音段过短，疑似误判" : undefined,
        reviewed: false,
      })
    }
  }

  return segments
}

export function detectBreathingPoints(rows: CleanedRow[], silenceSegments: SilenceSegment[]): BreathingPoint[] {
  const points: BreathingPoint[] = []
  let ptId = 0

  const normalSegments = silenceSegments.filter((s) => !s.isMisjudgment)

  for (const seg of normalSegments) {
    const beforeIdx = rows.findIndex((r) => r.timestamp >= seg.startTimestamp) - 1
    const afterIdx = rows.findIndex((r) => r.timestamp >= seg.endTimestamp)

    const amplitudeBefore = beforeIdx >= 0 ? rows[beforeIdx].amplitude : 0
    const amplitudeAfter = afterIdx >= 0 && afterIdx < rows.length ? rows[afterIdx].amplitude : 0

    const ampDrop = amplitudeBefore - amplitudeAfter
    const confidence = Math.min(1, ampDrop / 0.5)

    if (confidence >= BREATHING_CONFIDENCE_THRESHOLD) {
      points.push({
        id: `bp-${ptId++}`,
        timestamp: seg.startTimestamp,
        duration: seg.duration,
        amplitudeBefore,
        amplitudeAfter,
        confidence,
        source: "auto",
      })
    }
  }

  return points
}
