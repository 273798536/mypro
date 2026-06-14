import type { ConflictRecord, FilterCriteria } from '@/types'

export function timecodeToFrames(tc: string): number {
  const parts = tc.split(':').map(Number)
  if (parts.length !== 4) return 0
  return parts[0] * 3600 * 30 + parts[1] * 60 * 30 + parts[2] * 30 + parts[3]
}

export function doTimecodesOverlap(
  startA: string, endA: string,
  startB: string, endB: string,
): boolean {
  const aStart = timecodeToFrames(startA)
  const aEnd = timecodeToFrames(endA)
  const bStart = timecodeToFrames(startB)
  const bEnd = timecodeToFrames(endB)
  return aStart < bEnd && bStart < aEnd
}

export function filterRecords(
  records: ConflictRecord[],
  filter: FilterCriteria,
): ConflictRecord[] {
  return records.filter((r) => {
    if (filter.status.length > 0 && !filter.status.includes(r.status)) {
      return false
    }
    if (filter.timecodeRangeStart) {
      const filterStart = timecodeToFrames(filter.timecodeRangeStart)
      const recordEnd = timecodeToFrames(r.timecodeEnd)
      if (recordEnd < filterStart) return false
    }
    if (filter.timecodeRangeEnd) {
      const filterEnd = timecodeToFrames(filter.timecodeRangeEnd)
      const recordStart = timecodeToFrames(r.timecodeStart)
      if (recordStart > filterEnd) return false
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      const matchName = r.songName.toLowerCase().includes(kw)
      const matchAlias = r.songAlias.some((a) => a.toLowerCase().includes(kw))
      const matchReason = r.exceptionReason.toLowerCase().includes(kw)
      if (!matchName && !matchAlias && !matchReason) return false
    }
    if (filter.hasSupplementaryRemark !== null) {
      const has = r.supplementaryRemarks.length > 0
      if (filter.hasSupplementaryRemark !== has) return false
    }
    return true
  })
}

export function detectTimecodeConflicts(records: ConflictRecord[]): Map<string, string[]> {
  const conflictMap = new Map<string, string[]>()
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (doTimecodesOverlap(
        records[i].timecodeStart, records[i].timecodeEnd,
        records[j].timecodeStart, records[j].timecodeEnd,
      )) {
        const a = conflictMap.get(records[i].id) || []
        if (!a.includes(records[j].id)) a.push(records[j].id)
        conflictMap.set(records[i].id, a)
        const b = conflictMap.get(records[j].id) || []
        if (!b.includes(records[i].id)) b.push(records[i].id)
        conflictMap.set(records[j].id, b)
      }
    }
  }
  return conflictMap
}
