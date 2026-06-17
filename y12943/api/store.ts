import { getDb } from './db.js'
import type {
  Slice,
  ModelLog,
  Review,
  ImportBatch,
  Quality,
  BadType,
} from '../shared/types.js'

export function getAllSlices(): Slice[] {
  return getDb().prepare('SELECT * FROM slices').all() as Slice[]
}

export function getSlicesByFilter(filter: string): Slice[] {
  const db = getDb()
  if (filter === 'bad') {
    return db
      .prepare("SELECT * FROM slices WHERE quality = 'bad' ORDER BY bad_type, id")
      .all() as Slice[]
  }
  if (filter === 'pending') {
    return db.prepare("SELECT * FROM slices WHERE status = 'pending' ORDER BY id").all() as Slice[]
  }
  if (filter === 'pass') {
    return db.prepare("SELECT * FROM slices WHERE status = 'pass' ORDER BY id").all() as Slice[]
  }
  return db.prepare('SELECT * FROM slices ORDER BY id').all() as Slice[]
}

export function getSliceById(id: string): Slice | null {
  return (getDb().prepare('SELECT * FROM slices WHERE id = ?').get(id) as Slice) ?? null
}

export function getSliceByContentHash(hash: string): Slice | null {
  return (getDb().prepare('SELECT * FROM slices WHERE content_hash = ?').get(hash) as Slice) ?? null
}

export function getLogsBySlice(sliceId: string): ModelLog[] {
  return getDb()
    .prepare('SELECT * FROM logs WHERE slice_id = ? ORDER BY created_at, id')
    .all(sliceId) as ModelLog[]
}

export function getReviewBySliceMention(sliceId: string): Review | null {
  const reviews = getAllReviews()
  return reviews.find((r) => r.materials.includes(sliceId)) ?? null
}

export function getAllReviews(): Review[] {
  return getDb().prepare('SELECT * FROM reviews ORDER BY created_at DESC, id').all() as Review[]
}

export function getReviewById(id: string): Review | null {
  return (getDb().prepare('SELECT * FROM reviews WHERE id = ?').get(id) as Review) ?? null
}

export function resolveReview(id: string, conclusion: string): Review | null {
  getDb().prepare('UPDATE reviews SET conclusion = ? WHERE id = ?').run(conclusion, id)
  return getReviewById(id)
}

export function getImportById(id: string): ImportBatch | null {
  return (getDb().prepare('SELECT * FROM imports WHERE id = ?').get(id) as ImportBatch) ?? null
}

export function getAllImports(): ImportBatch[] {
  return getDb().prepare('SELECT * FROM imports ORDER BY created_at DESC, id').all() as ImportBatch[]
}

export function createImport(batch: ImportBatch): void {
  getDb()
    .prepare(
      'INSERT INTO imports (id, batch_name, source_path, created_at, status) VALUES (@id, @batch_name, @source_path, @created_at, @status)',
    )
    .run(batch)
}

export function createSlice(slice: Slice): void {
  getDb()
    .prepare(
      'INSERT INTO slices (id, import_id, seg_list, eval_bank, content, content_hash, quality, bad_type, status, dup_of, created_at) VALUES (@id, @import_id, @seg_list, @eval_bank, @content, @content_hash, @quality, @bad_type, @status, @dup_of, @created_at)',
    )
    .run(slice)
}

export function createLog(log: ModelLog): void {
  getDb()
    .prepare(
      'INSERT INTO logs (id, slice_id, event, message, created_at) VALUES (@id, @slice_id, @event, @message, @created_at)',
    )
    .run(log)
}

export function countSlicesByStatus(): {
  total: number
  pass: number
  pending: number
  bad: number
} {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) as c FROM slices GROUP BY status")
    .all() as { status: string; c: number }[]
  const total = rows.reduce((s, r) => s + r.c, 0)
  const pass = rows.find((r) => r.status === 'pass')?.c ?? 0
  const pending = rows.find((r) => r.status === 'pending')?.c ?? 0
  const bad = rows.find((r) => r.status === 'bad')?.c ?? 0
  return { total, pass, pending, bad }
}

export function countSlicesByBadType(): Record<BadType, number> {
  const rows = getDb()
    .prepare("SELECT bad_type, COUNT(*) as c FROM slices GROUP BY bad_type")
    .all() as { bad_type: BadType; c: number }[]
  const result: Record<BadType, number> = {
    none: 0,
    dirty_dup: 0,
    secure_misconfig: 0,
  }
  for (const r of rows) result[r.bad_type] = r.c
  return result
}

export function getDupPairs(): { from: string; to: string }[] {
  const rows = getDb()
    .prepare("SELECT id, dup_of FROM slices WHERE dup_of IS NOT NULL")
    .all() as { id: string; dup_of: string }[]
  return rows.map((r) => ({ from: r.id, to: r.dup_of }))
}

export function getSampleTrio(): { normal: Slice | null; edge: Slice | null; bad: Slice | null } {
  const db = getDb()
  const normal = (db
    .prepare("SELECT * FROM slices WHERE quality = 'normal' ORDER BY id LIMIT 1")
    .get() as Slice) ?? null
  const edge = (db
    .prepare("SELECT * FROM slices WHERE quality = 'edge' ORDER BY id LIMIT 1")
    .get() as Slice) ?? null
  const bad = (db
    .prepare("SELECT * FROM slices WHERE quality = 'bad' ORDER BY id LIMIT 1")
    .get() as Slice) ?? null
  return { normal, edge, bad }
}

export function getSecureMisconfigSlice(): Slice | null {
  return (getDb()
    .prepare("SELECT * FROM slices WHERE bad_type = 'secure_misconfig' ORDER BY id LIMIT 1")
    .get() as Slice) ?? null
}

export function getQualityByStatus(status: string): Quality {
  if (status === 'pass') return 'normal'
  if (status === 'bad') return 'bad'
  return 'edge'
}
