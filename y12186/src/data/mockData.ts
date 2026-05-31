import type { RawDataRow, BadRow, CleanedRow, AnalysisResult } from "@/types"
import { analyzeMelodyLine, detectSilenceSegments, detectBreathingPoints } from "@/utils/audioAnalyzer"
import { alignLyrics } from "@/utils/lyricsAligner"
import { generateTraceLink, buildBreathingAdvice } from "@/utils/traceBuilder"

function generateMockRawRows(): RawDataRow[] {
  const rows: RawDataRow[] = []
  let ts = 0
  const students = ["张小明", "李思思", "王子涵"]
  const songs = ["春晓", "茉莉花"]

  for (let s = 0; s < students.length; s++) {
    for (let song = 0; song < songs.length; song++) {
      for (let practice = 1; practice <= 2; practice++) {
        let t = ts
        const lyrics = songs[song] === "春晓"
          ? ["春眠不觉晓", "处处闻啼鸟", "夜来风雨声", "花落知多少"]
          : ["好一朵茉莉花", "好一朵茉莉花", "满园花开香也香不过它"]

        for (let i = 0; i < 80; i++) {
          const lyricIdx = Math.floor(i / 20) % lyrics.length
          const pitchBase = 60 + Math.sin(i * 0.1) * 12
          const pitchVar = Math.sin(i * 0.3 + s) * 5
          const pitch = pitchBase + pitchVar + (Math.random() - 0.5) * 3

          const isSilent = i % 20 === 0 && i > 0
          const amplitude = isSilent
            ? 0.01 + Math.random() * 0.01
            : 0.3 + Math.random() * 0.4

          rows.push({
            rowIndex: rows.length,
            timestamp: t,
            pitch: Math.round(pitch * 100) / 100,
            amplitude: Math.round(amplitude * 1000) / 1000,
            lyricsSegment: lyrics[lyricIdx],
            practiceCount: practice,
            rawLine: "",
          })
          t += 0.1
        }
        ts = t + 1
      }
    }
  }
  return rows
}

function generateMockBadRows(): BadRow[] {
  return [
    { rowIndex: 1000, rawLine: "", reason: "empty", missingColumns: [], recovered: false },
    { rowIndex: 1001, rawLine: "# 这是备注行", reason: "comment", missingColumns: [], recovered: false },
    { rowIndex: 1002, rawLine: "12.5,67.3,,歌词片段,1", reason: "missing_column", missingColumns: ["amplitude"], recovered: false },
    { rowIndex: 1003, rawLine: "", reason: "empty", missingColumns: [], recovered: false },
    { rowIndex: 1004, rawLine: "// 另一条备注", reason: "comment", missingColumns: [], recovered: false },
    { rowIndex: 1005, rawLine: "15.0,,0.45,,2", reason: "missing_column", missingColumns: ["pitch", "lyricsSegment"], recovered: false },
  ]
}

function buildAnalysisResult(
  rows: CleanedRow[],
  studentName: string,
  songTitle: string,
  practiceIndex: number
): AnalysisResult {
  const melodyLine = analyzeMelodyLine(rows)
  const silenceSegments = detectSilenceSegments(rows)
  const breathingPoints = detectBreathingPoints(rows, silenceSegments)
  const lyricsAlignments = alignLyrics(rows)

  const id = `mock-${studentName}-${songTitle}-${practiceIndex}`
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

export function generateMockData(): {
  rawRows: RawDataRow[]
  badRows: BadRow[]
  cleanedRows: CleanedRow[]
  results: AnalysisResult[]
  breathingAdvices: Record<string, string[]>
} {
  const rawRows = generateMockRawRows()
  const badRows = generateMockBadRows()

  const cleanedRows: CleanedRow[] = rawRows
    .filter((row) => row.pitch !== null && row.amplitude !== null)
    .map((row, i) => ({
      id: `clean-${i}`,
      timestamp: row.timestamp,
      pitch: row.pitch!,
      amplitude: row.amplitude!,
      lyricsSegment: row.lyricsSegment ?? "",
      practiceCount: row.practiceCount ?? 0,
      sourceRowIndex: row.rowIndex,
    }))

  const students = ["张小明", "李思思", "王子涵"]
  const songs = ["春晓", "茉莉花"]
  const results: AnalysisResult[] = []

  let offset = 0
  for (let s = 0; s < students.length; s++) {
    for (let song = 0; song < songs.length; song++) {
      for (let practice = 1; practice <= 2; practice++) {
        const chunk = cleanedRows.slice(offset, offset + 80)
        offset += 80
        if (chunk.length > 0) {
          results.push(buildAnalysisResult(chunk, students[s], songs[song], practice))
        }
      }
    }
  }

  const breathingAdvices: Record<string, string[]> = {}
  for (const r of results) {
    breathingAdvices[r.id] = buildBreathingAdvice(r.breathingPoints, r.lyricsAlignments)
  }

  return { rawRows, badRows, cleanedRows, results, breathingAdvices }
}
