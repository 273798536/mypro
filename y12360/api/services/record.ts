import { v4 as uuidv4 } from "uuid"
import { getDb } from "../db.js"
import { calculate } from "./affinityLaw.js"
import type {
  CalculateRequest,
  CalculationRecord,
  RecordFilter,
  PaginatedResult,
  Warning,
  StatusChange,
  RecordStatus,
} from "../../shared/types.js"

export function createRecord(req: CalculateRequest): CalculationRecord {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  const { results, warnings } = calculate(req)

  db.prepare(`
    INSERT INTO calculation_record (
      id, rated_flow, rated_flow_unit, rated_head, rated_head_unit,
      rated_power, rated_power_unit, rated_speed, target_speed,
      target_flow, target_head, target_power,
      flow_ratio, head_ratio, power_ratio, efficiency_estimate,
      source, version, status, remark, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.ratedFlow, req.ratedFlowUnit, req.ratedHead, req.ratedHeadUnit,
    req.ratedPower, req.ratedPowerUnit, req.ratedSpeed, req.targetSpeed,
    results.targetFlow, results.targetHead, results.targetPower,
    results.flowRatio, results.headRatio, results.powerRatio, results.efficiencyEstimate,
    req.source, 1, "draft", req.remark || null, now, now
  )

  for (const w of warnings) {
    db.prepare(`
      INSERT INTO validation_log (id, record_id, code, message, affected_fields, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, w.code, w.message, JSON.stringify(w.affectedFields), w.severity, now)
  }

  db.prepare(`
    INSERT INTO status_history (id, record_id, from_status, to_status, operator, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, "", "draft", "system", "创建记录", now)

  return getRecordById(id)!
}

export function updateRecord(id: string, req: CalculateRequest): CalculationRecord | null {
  const db = getDb()
  const existing = getRecordById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const { results, warnings } = calculate(req)
  const newVersion = existing.version + 1

  db.prepare(`
    UPDATE calculation_record SET
      rated_flow = ?, rated_flow_unit = ?, rated_head = ?, rated_head_unit = ?,
      rated_power = ?, rated_power_unit = ?, rated_speed = ?, target_speed = ?,
      target_flow = ?, target_head = ?, target_power = ?,
      flow_ratio = ?, head_ratio = ?, power_ratio = ?, efficiency_estimate = ?,
      source = ?, version = ?, remark = ?, updated_at = ?
    WHERE id = ?
  `).run(
    req.ratedFlow, req.ratedFlowUnit, req.ratedHead, req.ratedHeadUnit,
    req.ratedPower, req.ratedPowerUnit, req.ratedSpeed, req.targetSpeed,
    results.targetFlow, results.targetHead, results.targetPower,
    results.flowRatio, results.headRatio, results.powerRatio, results.efficiencyEstimate,
    req.source, newVersion, req.remark || null, now, id
  )

  db.prepare("DELETE FROM validation_log WHERE record_id = ?").run(id)

  for (const w of warnings) {
    db.prepare(`
      INSERT INTO validation_log (id, record_id, code, message, affected_fields, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, w.code, w.message, JSON.stringify(w.affectedFields), w.severity, now)
  }

  return getRecordById(id)
}

export function getRecordById(id: string): CalculationRecord | null {
  const db = getDb()
  const row = db.prepare("SELECT * FROM calculation_record WHERE id = ?").get(id) as any
  if (!row) return null

  return mapRowToRecord(row)
}

export function getRecords(filter: RecordFilter): PaginatedResult<CalculationRecord> {
  const db = getDb()
  const page = filter.page || 1
  const pageSize = filter.pageSize || 20
  const offset = (page - 1) * pageSize

  let where = "1=1"
  const params: any[] = []

  if (filter.status) {
    where += " AND status = ?"
    params.push(filter.status)
  }
  if (filter.source) {
    where += " AND source = ?"
    params.push(filter.source)
  }
  if (filter.keyword) {
    where += " AND (remark LIKE ? OR source LIKE ?)"
    params.push(`%${filter.keyword}%`, `%${filter.keyword}%`)
  }
  if (filter.dateFrom) {
    where += " AND created_at >= ?"
    params.push(filter.dateFrom)
  }
  if (filter.dateTo) {
    where += " AND created_at <= ?"
    params.push(filter.dateTo)
  }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM calculation_record WHERE ${where}`).get(...params) as any).cnt
  const rows = db.prepare(`SELECT * FROM calculation_record WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as any[]

  return {
    data: rows.map(mapRowToRecord),
    total,
    page,
    pageSize,
  }
}

export function advanceStatus(id: string, newStatus: RecordStatus, operator: string, comment?: string): CalculationRecord | null {
  const db = getDb()
  const existing = getRecordById(id)
  if (!existing) return null

  const now = new Date().toISOString()

  db.prepare("UPDATE calculation_record SET status = ?, updated_at = ? WHERE id = ?").run(newStatus, now, id)

  db.prepare(`
    INSERT INTO status_history (id, record_id, from_status, to_status, operator, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, existing.status, newStatus, operator, comment || null, now)

  return getRecordById(id)
}

export function deleteRecord(id: string): boolean {
  const db = getDb()
  const existing = getRecordById(id)
  if (!existing) return false

  db.prepare("DELETE FROM validation_log WHERE record_id = ?").run(id)
  db.prepare("DELETE FROM status_history WHERE record_id = ?").run(id)
  db.prepare("DELETE FROM calculation_record WHERE id = ?").run(id)
  return true
}

export function compareRecords(recordIds: string[], name: string): { id: string; records: CalculationRecord[] } {
  const db = getDb()
  const records = recordIds.map(id => getRecordById(id)).filter(Boolean) as CalculationRecord[]

  const summary = records.map(r =>
    `${r.source}: Q=${r.targetFlow}${r.ratedFlowUnit} H=${r.targetHead}${r.ratedHeadUnit} P=${r.targetPower}${r.ratedPowerUnit} η=${r.efficiencyEstimate}`
  ).join(" | ")

  const comparisonId = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO scheme_comparison (id, record_ids, comparison_name, result_summary, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(comparisonId, JSON.stringify(recordIds), name, summary, now)

  return { id: comparisonId, records }
}

function mapRowToRecord(row: any): CalculationRecord {
  const db = getDb()

  const warningRows = db.prepare("SELECT * FROM validation_log WHERE record_id = ?").all(row.id) as any[]
  const warnings: Warning[] = warningRows.map(w => ({
    code: w.code,
    message: w.message,
    affectedFields: JSON.parse(w.affected_fields),
    severity: w.severity,
  }))

  const historyRows = db.prepare("SELECT * FROM status_history WHERE record_id = ? ORDER BY created_at ASC").all(row.id) as any[]
  const statusHistory: StatusChange[] = historyRows.map(h => ({
    id: h.id,
    recordId: h.record_id,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    operator: h.operator,
    comment: h.comment,
    createdAt: h.created_at,
  }))

  return {
    id: row.id,
    ratedFlow: Number(row.rated_flow),
    ratedFlowUnit: row.rated_flow_unit,
    ratedHead: Number(row.rated_head),
    ratedHeadUnit: row.rated_head_unit,
    ratedPower: Number(row.rated_power),
    ratedPowerUnit: row.rated_power_unit,
    ratedSpeed: row.rated_speed,
    targetSpeed: row.target_speed,
    speedUnit: "rpm",
    targetFlow: row.target_flow != null ? Number(row.target_flow) : null,
    targetHead: row.target_head != null ? Number(row.target_head) : null,
    targetPower: row.target_power != null ? Number(row.target_power) : null,
    flowRatio: row.flow_ratio,
    headRatio: row.head_ratio,
    powerRatio: row.power_ratio,
    efficiencyEstimate: row.efficiency_estimate,
    source: row.source,
    version: row.version,
    status: row.status,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    warnings,
    statusHistory,
  }
}
