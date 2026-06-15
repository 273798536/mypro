import { v4 as uuid } from "uuid"
import type { CorrectionRecord } from "@/types"

export function createCorrection(
  recordId: string,
  field: string,
  oldValue: string | number | null,
  newValue: string | number | null,
  reason: string,
  operator: string = "场长"
): CorrectionRecord {
  return {
    id: uuid(),
    recordId,
    field,
    oldValue,
    newValue,
    reason,
    operator,
    timestamp: new Date().toISOString(),
    reviewStatus: "pending",
  }
}

export function formatCorrectionValue(val: string | number | null): string {
  if (val === null) return "（空）"
  return String(val)
}

export function describeCorrection(c: CorrectionRecord): string {
  const oldVal = formatCorrectionValue(c.oldValue)
  const newVal = formatCorrectionValue(c.newValue)
  return `${c.field}: ${oldVal} → ${newVal}（${c.reason}）`
}
