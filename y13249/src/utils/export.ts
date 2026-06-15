import { ExportPayload, ScreenshotRecord, FilterCriteria } from "@/types"
import { applyFilter, buildFilterCriteriaText, getNextExportNumber } from "./storage"

export function exportPageSummary(
  allRecords: ScreenshotRecord[],
  criteria: FilterCriteria
): void {
  const filtered = applyFilter(allRecords, criteria)
  const criteriaText = buildFilterCriteriaText(criteria)

  const summary = {
    total: filtered.length,
    anomaly: filtered.filter((r) => r.status === "anomaly").length,
    annotated: filtered.filter((r) => r.manualAnnotation !== null).length,
    pending: filtered.filter((r) => r.status === "pending").length,
  }

  const payload: ExportPayload = {
    exportTime: new Date().toISOString(),
    filterCriteria: criteria,
    filterCriteriaText: criteriaText,
    summary,
    records: filtered,
  }

  const num = getNextExportNumber()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `播客片头分账对齐_导出${String(num).padStart(3, "0")}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
