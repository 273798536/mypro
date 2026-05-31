import Papa from "papaparse"
import type { RawDataRow, BadRow, CleanedRow } from "@/types"

const REQUIRED_COLUMNS = ["timestamp", "pitch", "amplitude", "lyricsSegment", "practiceCount"]

export function parseCSV(rawText: string): {
  rawRows: RawDataRow[]
  badRows: BadRow[]
} {
  const result = Papa.parse(rawText, {
    header: true,
    skipEmptyLines: false,
    dynamicTyping: true,
  })

  const rawRows: RawDataRow[] = []
  const badRows: BadRow[] = []

  const lines = rawText.split(/\r?\n/)

  result.data.forEach((row: Record<string, unknown>, index: number) => {
    const rawLine = lines[index] ?? ""
    const trimmedLine = rawLine.trim()

    if (trimmedLine === "") {
      badRows.push({
        rowIndex: index,
        rawLine,
        reason: "empty",
        missingColumns: [],
        recovered: false,
      })
      return
    }

    if (trimmedLine.startsWith("#") || trimmedLine.startsWith("//")) {
      badRows.push({
        rowIndex: index,
        rawLine,
        reason: "comment",
        missingColumns: [],
        recovered: false,
      })
      return
    }

    const missingColumns: string[] = []
    for (const col of REQUIRED_COLUMNS) {
      if (row[col] === undefined || row[col] === null || row[col] === "") {
        missingColumns.push(col)
      }
    }

    if (missingColumns.length > 0) {
      badRows.push({
        rowIndex: index,
        rawLine,
        reason: "missing_column",
        missingColumns,
        recovered: false,
      })
      return
    }

    rawRows.push({
      rowIndex: index,
      timestamp: Number(row.timestamp) || 0,
      pitch: row.pitch !== null && row.pitch !== undefined ? Number(row.pitch) : null,
      amplitude: row.amplitude !== null && row.amplitude !== undefined ? Number(row.amplitude) : null,
      lyricsSegment: row.lyricsSegment !== null && row.lyricsSegment !== undefined ? String(row.lyricsSegment) : null,
      practiceCount: row.practiceCount !== null && row.practiceCount !== undefined ? Number(row.practiceCount) : null,
      rawLine,
    })
  })

  return { rawRows, badRows }
}

export function cleanRawRows(rawRows: RawDataRow[]): CleanedRow[] {
  return rawRows
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
}
