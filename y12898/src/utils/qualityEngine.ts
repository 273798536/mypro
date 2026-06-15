import { v4 as uuid } from "uuid"
import type { TidalRecord, QualityIssue, IssueType, IssueSeverity } from "@/types"

export function detectNullValues(records: TidalRecord[]): QualityIssue[] {
  return records
    .filter((r) => r.tideLevel === null)
    .map((r) => ({
      id: uuid(),
      type: "null_value" as IssueType,
      recordId: r.id,
      description: `记录 ${r.timestamp} 的潮位值为空`,
      severity: "critical" as IssueSeverity,
      status: "pending" as const,
    }))
}

export function detectDuplicates(records: TidalRecord[]): QualityIssue[] {
  const issues: QualityIssue[] = []
  const seen = new Map<string, TidalRecord[]>()

  for (const r of records) {
    const key = r.timestamp
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key)!.push(r)
  }

  for (const [, group] of seen) {
    if (group.length > 1) {
      for (let i = 1; i < group.length; i++) {
        issues.push({
          id: uuid(),
          type: "duplicate",
          recordId: group[i].id,
          description: `记录 ${group[i].timestamp} 与已有记录重复（来源: ${group[i].source}）`,
          severity: "warning",
          status: "pending",
        })
      }
    }
  }

  return issues
}

export function detectTimezoneErrors(records: TidalRecord[]): QualityIssue[] {
  const expectedTz = "UTC+8"
  return records
    .filter((r) => r.timezone !== expectedTz)
    .map((r) => ({
      id: uuid(),
      type: "timezone_error" as IssueType,
      recordId: r.id,
      description: `记录 ${r.timestamp} 时区为 ${r.timezone}，预期 ${expectedTz}`,
      severity: "warning" as IssueSeverity,
      status: "pending" as const,
    }))
}

export function detectMixedRemarks(records: TidalRecord[]): QualityIssue[] {
  return records
    .filter((r) => {
      if (!r.remark) return false
      const hasNumber = /\d/.test(r.remark)
      const hasChinese = /[\u4e00-\u9fa5]/.test(r.remark)
      return hasNumber && hasChinese
    })
    .map((r) => ({
      id: uuid(),
      type: "mixed_remark" as IssueType,
      recordId: r.id,
      description: `记录 ${r.timestamp} 备注字段混写了数值与文字: "${r.remark}"`,
      severity: "info" as IssueSeverity,
      status: "pending" as const,
    }))
}

export function runAllChecks(records: TidalRecord[]): QualityIssue[] {
  return [
    ...detectNullValues(records),
    ...detectDuplicates(records),
    ...detectTimezoneErrors(records),
    ...detectMixedRemarks(records),
  ]
}
