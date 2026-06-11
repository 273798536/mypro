import { v4 as uuid } from 'uuid'
import { getDb } from '../db.js'
import type { CryoRecord, CreateRecordRequest, ImportCheckResponse } from '../types.js'

export function checkDuplicates(records: CreateRecordRequest[]): ImportCheckResponse {
  const db = getDb()
  const duplicates: ImportCheckResponse['duplicates'] = []
  const conflicts: ImportCheckResponse['conflicts'] = []
  let newCount = 0

  for (const incoming of records) {
    const existing = db.prepare(
      `SELECT * FROM cryo_records WHERE cell_line = ? AND date = ? AND type = ? AND passage_number = ?`
    ).get(incoming.cell_line, incoming.date, incoming.type, incoming.passage_number) as CryoRecord | undefined

    if (!existing) {
      newCount++
      continue
    }

    const conflictFields = getConflictFields(existing, incoming)
    if (conflictFields.length > 0) {
      conflicts.push({
        existing_id: existing.id,
        incoming,
        conflict_fields: conflictFields,
      })
    } else {
      duplicates.push({
        existing_id: existing.id,
        incoming,
        match_field: 'cell_line+date+type+passage_number',
      })
    }
  }

  return {
    new_count: newCount,
    duplicate_count: duplicates.length,
    conflict_count: conflicts.length,
    duplicates,
    conflicts,
  }
}

function getConflictFields(existing: CryoRecord, incoming: CreateRecordRequest): string[] {
  const fields: string[] = []
  if (incoming.operator && incoming.operator !== existing.operator) fields.push('operator')
  if (incoming.freezing_medium && incoming.freezing_medium !== existing.freezing_medium) fields.push('freezing_medium')
  if (incoming.reagent_batch_id && incoming.reagent_batch_id !== existing.reagent_batch_id) fields.push('reagent_batch_id')
  if (incoming.storage_location && incoming.storage_location !== existing.storage_location) fields.push('storage_location')
  if (incoming.viability_rate !== undefined && incoming.viability_rate !== existing.viability_rate) fields.push('viability_rate')
  if (incoming.parent_record_id && incoming.parent_record_id !== existing.parent_record_id) fields.push('parent_record_id')
  return fields
}

export function resolveImport(
  records: CreateRecordRequest[],
  resolution: 'skip' | 'overwrite' | 'new' = 'skip',
  resolutions?: Record<string, 'skip' | 'overwrite' | 'new'>
): { imported: number; skipped: number; overwritten: number; imported_ids: string[]; overwritten_ids: string[] } {
  const db = getDb()
  let imported = 0, skipped = 0, overwritten = 0
  const imported_ids: string[] = []
  const overwritten_ids: string[] = []

  records.forEach((r, idx) => {
    const strat = resolutions?.[String(idx)] ?? resolution
    const existing = db.prepare(
      `SELECT id FROM cryo_records WHERE cell_line = ? AND date = ? AND type = ? AND passage_number = ?`
    ).get(r.cell_line, r.date, r.type, r.passage_number) as { id: string } | undefined

    if (!existing) {
      imported_ids.push(insertRecord(db, r))
      imported++
      return
    }

    if (strat === 'skip') {
      skipped++
    } else if (strat === 'overwrite') {
      const now = new Date().toISOString()
      db.prepare(
        `UPDATE cryo_records SET operator=?, freezing_medium=?, reagent_batch_id=?, storage_location=?, viability_rate=?, parent_record_id=?, notes=?, updated_at=? WHERE id=?`
      ).run(
        r.operator, r.freezing_medium || '', r.reagent_batch_id,
        r.storage_location || '', r.viability_rate ?? null,
        r.parent_record_id || null, r.notes || '', now, existing.id
      )
      overwritten_ids.push(existing.id)
      overwritten++
    } else if (strat === 'new') {
      imported_ids.push(insertRecord(db, r))
      imported++
    }
  })

  return { imported, skipped, overwritten, imported_ids, overwritten_ids }
}

function insertRecord(db: ReturnType<typeof getDb>, r: CreateRecordRequest): string {
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO cryo_records (id, type, cell_line, passage_number, operator, date, freezing_medium, reagent_batch_id, storage_location, viability_rate, conclusion, status, parent_record_id, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id, r.type, r.cell_line, r.passage_number, r.operator, r.date,
    r.freezing_medium || '', r.reagent_batch_id, r.storage_location || '',
    r.viability_rate ?? null, 'pending', 'usable',
    r.parent_record_id || null, r.notes || '', now, now
  )
  return id
}
