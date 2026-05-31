import type { CleanedRow, LyricsAlignment } from "@/types"

const LONG_SENTENCE_THRESHOLD = 8.0
const MISALIGN_TOLERANCE = 0.3

export function alignLyrics(rows: CleanedRow[]): LyricsAlignment[] {
  const alignments: LyricsAlignment[] = []
  let alignId = 0

  const segments = groupByLyricsSegment(rows)

  for (const seg of segments) {
    const duration = seg.endTimestamp - seg.startTimestamp
    const isOverLong = duration > LONG_SENTENCE_THRESHOLD

    const expectedMidpoint = (seg.startTimestamp + seg.endTimestamp) / 2
    const actualMidpoint = seg.rows.reduce((sum, r) => sum + r.timestamp, 0) / seg.rows.length
    const misalignment = Math.abs(actualMidpoint - expectedMidpoint)
    const isMisaligned = misalignment > MISALIGN_TOLERANCE

    alignments.push({
      id: `lyr-${alignId++}`,
      lyricsSegment: seg.lyrics,
      startTimestamp: seg.startTimestamp,
      endTimestamp: seg.endTimestamp,
      isMisaligned,
      misalignmentDetail: isMisaligned
        ? `歌词中点偏移 ${misalignment.toFixed(2)}s（阈值 ${MISALIGN_TOLERANCE}s）`
        : undefined,
      isOverLong,
      durationThreshold: LONG_SENTENCE_THRESHOLD,
      reviewed: false,
    })
  }

  return alignments
}

interface LyricsSegment {
  lyrics: string
  startTimestamp: number
  endTimestamp: number
  rows: CleanedRow[]
}

function groupByLyricsSegment(rows: CleanedRow[]): LyricsSegment[] {
  const segments: LyricsSegment[] = []
  let currentLyrics = ""
  let currentRows: CleanedRow[] = []

  for (const row of rows) {
    if (row.lyricsSegment && row.lyricsSegment !== currentLyrics) {
      if (currentRows.length > 0) {
        segments.push({
          lyrics: currentLyrics,
          startTimestamp: currentRows[0].timestamp,
          endTimestamp: currentRows[currentRows.length - 1].timestamp,
          rows: currentRows,
        })
      }
      currentLyrics = row.lyricsSegment
      currentRows = [row]
    } else {
      currentRows.push(row)
    }
  }

  if (currentRows.length > 0) {
    segments.push({
      lyrics: currentLyrics || "(无歌词)",
      startTimestamp: currentRows[0].timestamp,
      endTimestamp: currentRows[currentRows.length - 1].timestamp,
      rows: currentRows,
    })
  }

  return segments
}
