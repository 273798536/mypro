import { create } from "zustand"
import type { RawDataRow, BadRow, CleanedRow, AnalysisResult, SilenceSegment, LyricsAlignment } from "@/types"
import { parseCSV, cleanRawRows } from "@/utils/csvParser"
import { analyzeMelodyLine, detectSilenceSegments, detectBreathingPoints } from "@/utils/audioAnalyzer"
import { alignLyrics } from "@/utils/lyricsAligner"
import { generateTraceLink, buildBreathingAdvice } from "@/utils/traceBuilder"
import { generateMockData } from "@/data/mockData"

interface AnalysisStore {
  rawRows: RawDataRow[]
  badRows: BadRow[]
  cleanedRows: CleanedRow[]
  results: AnalysisResult[]
  breathingAdvices: Record<string, string[]>
  fileLoaded: boolean
  fileName: string

  loadCSV: (text: string, fileName: string) => void
  loadMockData: () => void
  recoverBadRow: (rowIndex: number) => void
  markSilenceReviewed: (resultId: string, silenceId: string) => void
  markSilenceMisjudgment: (resultId: string, silenceId: string, isMisjudgment: boolean) => void
  markLyricsReviewed: (resultId: string, lyricsId: string) => void
  reset: () => void
}

export const useStore = create<AnalysisStore>((set, get) => ({
  rawRows: [],
  badRows: [],
  cleanedRows: [],
  results: [],
  breathingAdvices: {},
  fileLoaded: false,
  fileName: "",

  loadCSV: (text: string, fileName: string) => {
    const { rawRows, badRows } = parseCSV(text)
    const cleanedRows = cleanRawRows(rawRows)

    const results = buildResultsFromCleanedRows(cleanedRows)
    const breathingAdvices: Record<string, string[]> = {}
    for (const r of results) {
      breathingAdvices[r.id] = buildBreathingAdvice(r.breathingPoints, r.lyricsAlignments)
    }

    set({
      rawRows,
      badRows,
      cleanedRows,
      results,
      breathingAdvices,
      fileLoaded: true,
      fileName,
    })
  },

  loadMockData: () => {
    const { rawRows, badRows, cleanedRows, results, breathingAdvices } = generateMockData()
    set({
      rawRows,
      badRows,
      cleanedRows,
      results,
      breathingAdvices,
      fileLoaded: true,
      fileName: "演示数据",
    })
  },

  recoverBadRow: (rowIndex: number) => {
    const { badRows, rawRows } = get()
    const updatedBadRows = badRows.map((b) =>
      b.rowIndex === rowIndex ? { ...b, recovered: true } : b
    )

    const recoveredBadRow = badRows.find((b) => b.rowIndex === rowIndex)
    if (!recoveredBadRow) return

    const sourceRow = rawRows.find((r) => r.rowIndex === rowIndex)
    if (!sourceRow) return

    const newCleanedRow: CleanedRow = {
      id: `clean-recovered-${rowIndex}`,
      timestamp: sourceRow.timestamp || 0,
      pitch: sourceRow.pitch ?? 0,
      amplitude: sourceRow.amplitude ?? 0,
      lyricsSegment: sourceRow.lyricsSegment ?? "",
      practiceCount: sourceRow.practiceCount ?? 0,
      sourceRowIndex: rowIndex,
    }

    const updatedCleanedRows = [...get().cleanedRows, newCleanedRow].sort(
      (a, b) => a.timestamp - b.timestamp
    )

    const results = buildResultsFromCleanedRows(updatedCleanedRows)
    const breathingAdvices: Record<string, string[]> = {}
    for (const r of results) {
      breathingAdvices[r.id] = buildBreathingAdvice(r.breathingPoints, r.lyricsAlignments)
    }

    set({
      badRows: updatedBadRows,
      cleanedRows: updatedCleanedRows,
      results,
      breathingAdvices,
    })
  },

  markSilenceReviewed: (resultId: string, silenceId: string) => {
    set({
      results: get().results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              silenceSegments: r.silenceSegments.map((s) =>
                s.id === silenceId ? { ...s, reviewed: true } : s
              ),
            }
          : r
      ),
    })
  },

  markSilenceMisjudgment: (resultId: string, silenceId: string, isMisjudgment: boolean) => {
    const results = get().results.map((r) =>
      r.id === resultId
        ? {
            ...r,
            silenceSegments: r.silenceSegments.map((s) =>
              s.id === silenceId
                ? {
                    ...s,
                    isMisjudgment,
                    misjudgmentReason: isMisjudgment ? "教师标记为误判" : undefined,
                    reviewed: true,
                  }
                : s
            ),
          }
        : r
    )
    const breathingAdvices: Record<string, string[]> = {}
    for (const r of results) {
      breathingAdvices[r.id] = buildBreathingAdvice(r.breathingPoints, r.lyricsAlignments)
    }
    set({ results, breathingAdvices })
  },

  markLyricsReviewed: (resultId: string, lyricsId: string) => {
    set({
      results: get().results.map((r) =>
        r.id === resultId
          ? {
              ...r,
              lyricsAlignments: r.lyricsAlignments.map((l) =>
                l.id === lyricsId ? { ...l, reviewed: true } : l
              ),
            }
          : r
      ),
    })
  },

  reset: () => {
    set({
      rawRows: [],
      badRows: [],
      cleanedRows: [],
      results: [],
      breathingAdvices: {},
      fileLoaded: false,
      fileName: "",
    })
  },
}))

function buildResultsFromCleanedRows(rows: CleanedRow[]): AnalysisResult[] {
  const groups = new Map<string, CleanedRow[]>()

  for (const row of rows) {
    const key = `${row.lyricsSegment || "unknown"}-${row.practiceCount}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  }

  const results: AnalysisResult[] = []
  let idx = 0
  const studentNames = ["学生A", "学生B", "学生C"]
  const songTitles = ["曲目1", "曲目2"]

  for (const [, chunk] of groups) {
    const melodyLine = analyzeMelodyLine(chunk)
    const silenceSegments = detectSilenceSegments(chunk)
    const breathingPoints = detectBreathingPoints(chunk, silenceSegments)
    const lyricsAlignments = alignLyrics(chunk)

    const sIdx = idx % studentNames.length
    const songIdx = Math.floor(idx / studentNames.length) % songTitles.length
    const practiceIdx = Math.floor(idx / (studentNames.length * songTitles.length)) + 1

    const id = `result-${Date.now()}-${idx}`
    const traceLink = generateTraceLink(id)

    results.push({
      id,
      studentName: studentNames[sIdx],
      songTitle: songTitles[songIdx],
      practiceIndex: practiceIdx,
      breathingPoints,
      silenceSegments,
      lyricsAlignments,
      melodyLine,
      traceLink,
    })
    idx++
  }

  return results
}
