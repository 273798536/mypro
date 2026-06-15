import { ScreenshotRecord, FilterCriteria } from "@/types"

const STORAGE_KEY = "podcast_align_records"
const EXPORT_COUNTER_KEY = "podcast_align_export_counter"

export function loadRecords(): ScreenshotRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveRecords(records: ScreenshotRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function getNextExportNumber(): number {
  const current = parseInt(localStorage.getItem(EXPORT_COUNTER_KEY) || "0", 10)
  const next = current + 1
  localStorage.setItem(EXPORT_COUNTER_KEY, String(next))
  return next
}

export function buildFilterCriteriaText(criteria: FilterCriteria): string {
  const parts: string[] = []
  if (criteria.statuses.length > 0 && criteria.statuses.length < 4) {
    const labels: Record<string, string> = {
      pending: "待处理",
      recognized: "已识别",
      anomaly: "异常",
      annotated: "已批注",
    }
    parts.push(`状态: ${criteria.statuses.map((s) => labels[s]).join("、")}`)
  }
  if (criteria.dateRange) {
    parts.push(`日期: ${criteria.dateRange.start} ~ ${criteria.dateRange.end}`)
  }
  if (criteria.hasAnomaly === true) {
    parts.push("仅异常")
  }
  if (criteria.hasManualAnnotation === true) {
    parts.push("仅有人工批注")
  }
  return parts.length > 0 ? parts.join("；") : "全部记录"
}

export function applyFilter(
  records: ScreenshotRecord[],
  criteria: FilterCriteria
): ScreenshotRecord[] {
  return records.filter((r) => {
    if (criteria.statuses.length > 0 && !criteria.statuses.includes(r.status)) {
      return false
    }
    if (criteria.dateRange) {
      const d = r.uploadTime.slice(0, 10)
      if (d < criteria.dateRange.start || d > criteria.dateRange.end) return false
    }
    if (criteria.hasAnomaly === true && r.status !== "anomaly") return false
    if (
      criteria.hasManualAnnotation === true &&
      !r.manualAnnotation
    )
      return false
    return true
  })
}
