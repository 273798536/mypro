import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

function parseEnumValue(raw: string | null | undefined): { parsed: string[]; nullFlag: boolean; duplicateFlag: boolean; mixedNoteFlag: boolean } {
  if (!raw || raw.trim() === '') {
    return { parsed: [], nullFlag: true, duplicateFlag: false, mixedNoteFlag: false }
  }
  const mixedNoteFlag = /(\/\/|#|--|\/\*|\*\/|TODO|FIXME|NOTE)/i.test(raw)
  const cleaned = raw
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
  if (cleaned === '') {
    return { parsed: [], nullFlag: true, duplicateFlag: false, mixedNoteFlag }
  }
  const parts = cleaned.split(/[,，;；|/\s]+/).map((p) => p.trim()).filter((p) => p.length > 0)
  const seen = new Set<string>()
  const duplicates: string[] = []
  const unique: string[] = []
  for (const p of parts) {
    if (seen.has(p)) {
      duplicates.push(p)
    } else {
      seen.add(p)
      unique.push(p)
    }
  }
  return { parsed: unique, nullFlag: false, duplicateFlag: duplicates.length > 0, mixedNoteFlag }
}

router.get('/', (req: Request, res: Response) => {
  const { dirtyFlag, tableName, fieldName } = req.query
  let sql = 'SELECT * FROM snapshots WHERE 1=1'
  const params: unknown[] = []

  if (dirtyFlag) {
    sql += ' AND (null_flag = 1 OR duplicate_flag = 1 OR mixed_note_flag = 1)'
  }
  if (tableName) {
    sql += ' AND table_name = ?'
    params.push(tableName)
  }
  if (fieldName) {
    sql += ' AND field_name = ?'
    params.push(fieldName)
  }

  sql += ' ORDER BY snapshot_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

router.post('/ingest', (req: Request, res: Response) => {
  const { tableName, fieldName, rawValue, notes, snapshotAt } = req.body
  if (!tableName || !fieldName) {
    res.status(400).json({ ok: false, error: 'tableName and fieldName are required' })
    return
  }

  const parsed = parseEnumValue(rawValue)
  const id = uuidv4()
  const now = snapshotAt || new Date().toISOString()

  db.prepare(
    'INSERT INTO snapshots (id, snapshot_at, table_name, field_name, raw_value, null_flag, duplicate_flag, mixed_note_flag, parsed_enum, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    now,
    tableName,
    fieldName,
    rawValue || null,
    parsed.nullFlag ? 1 : 0,
    parsed.duplicateFlag ? 1 : 0,
    parsed.mixedNoteFlag ? 1 : 0,
    parsed.parsed.join(','),
    notes || null,
  )

  const row = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id)
  res.json({ ok: true, data: row })
})

export default router
