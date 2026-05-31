import type { AnalysisResult, CleanedRow } from "@/types"
import type { BreathingPoint, SilenceSegment, LyricsAlignment, MelodyPoint } from "@/types"
import { analyzeMelodyLine, detectSilenceSegments, detectBreathingPoints } from "@/utils/audioAnalyzer"
import { alignLyrics } from "@/utils/lyricsAligner"

export function generateTraceLink(resultId: string): AnalysisResult["traceLink"] {
  return {
    resultId,
    audioAnalysisRef: `audio-${resultId}`,
    lyricsAlignmentRef: `lyrics-${resultId}`,
    breathingAdviceRef: `advice-${resultId}`,
  }
}

export function buildBreathingAdvice(
  breathingPoints: BreathingPoint[],
  lyricsAlignments: LyricsAlignment[]
): string[] {
  const advices: string[] = []

  if (breathingPoints.length === 0) {
    advices.push("未检测到换气点，请确认录音数据是否完整。")
    return advices
  }

  const avgConfidence = breathingPoints.reduce((s, p) => s + p.confidence, 0) / breathingPoints.length
  if (avgConfidence < 0.7) {
    advices.push("换气点整体置信度较低，建议人工复核。")
  }

  const overLongSegments = lyricsAlignments.filter((a) => a.isOverLong)
  for (const seg of overLongSegments) {
    const nearestBp = breathingPoints.find(
      (bp) => bp.timestamp >= seg.startTimestamp && bp.timestamp <= seg.endTimestamp
    )
    if (!nearestBp) {
      advices.push(
        `歌词段"${seg.lyricsSegment}"时长 ${((seg.endTimestamp - seg.startTimestamp) * 10).toFixed(1)}s 超限，建议在中间增加换气点。`
      )
    }
  }

  const misalignedSegments = lyricsAlignments.filter((a) => a.isMisaligned)
  for (const seg of misalignedSegments) {
    advices.push(
      `歌词段"${seg.lyricsSegment}"对齐偏移较大，请检查歌词时间轴。`
    )
  }

  if (advices.length === 0) {
    advices.push("换气点分布合理，歌词对齐正常。")
  }

  return advices
}

export function runFullAnalysis(
  rows: CleanedRow[],
  studentName: string,
  songTitle: string,
  practiceIndex: number
): AnalysisResult {
  const melodyLine: MelodyPoint[] = analyzeMelodyLine(rows)
  const silenceSegments: SilenceSegment[] = detectSilenceSegments(rows)
  const breathingPoints: BreathingPoint[] = detectBreathingPoints(rows, silenceSegments)
  const lyricsAlignments: LyricsAlignment[] = alignLyrics(rows)

  const id = `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const traceLink = generateTraceLink(id)

  return {
    id,
    studentName,
    songTitle,
    practiceIndex,
    breathingPoints,
    silenceSegments,
    lyricsAlignments,
    melodyLine,
    traceLink,
  }
}
