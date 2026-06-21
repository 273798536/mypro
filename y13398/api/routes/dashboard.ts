import { Router, type Request, type Response } from 'express'
import { getDb } from '../db.js'
import type {
  ChangeType,
  DashboardRecord,
  DashboardSummary,
  RecordStatus,
  VersionCompareResult,
} from '../../shared/types.js'

const router = Router()

interface RawRow {
  id: string
  source: string
  original_value: string | null
  current_value: string
  change_type: string
  status: string
  is_contaminated: number
  contamination_note: string | null
  next_steps: string | null
  raw_log_ref: string | null
  version: string
  created_at: string
}

function mapRow(row: RawRow): DashboardRecord {
  return {
    id: row.id,
    source: row.source,
    originalValue: row.original_value,
    currentValue: row.current_value,
    changeType: row.change_type as ChangeType,
    status: row.status as RecordStatus,
    isContaminated: row.is_contaminated === 1,
    contaminationNote: row.contamination_note,
    nextSteps: row.next_steps ? JSON.parse(row.next_steps) : null,
    rawLogRef: row.raw_log_ref,
    version: row.version,
    createdAt: row.created_at,
  }
}

router.get('/dashboard/summary', (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const total = (db.prepare('SELECT COUNT(*) AS cnt FROM records').get() as { cnt: number }).cnt
    const processed = (db.prepare("SELECT COUNT(*) AS cnt FROM records WHERE status = 'processed'").get() as { cnt: number }).cnt
    const pendingEvidence = (db.prepare("SELECT COUNT(*) AS cnt FROM records WHERE status = 'pending'").get() as { cnt: number }).cnt
    const anomalous = (db.prepare("SELECT COUNT(*) AS cnt FROM records WHERE status = 'anomalous'").get() as { cnt: number }).cnt

    const trend: Array<{ date: string; cost: number }> = []
    const baseDate = new Date('2026-06-08')
    for (let i = 0; i < 14; i++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const base = 0.03 + Math.random() * 0.02
      const spike = i === 10 ? 0.015 : 0
      trend.push({ date: dateStr, cost: Math.round((base + spike) * 1000) / 1000 })
    }

    const alertRows = db.prepare(
      "SELECT * FROM records WHERE status IN ('pending', 'anomalous') AND version = 'v2' ORDER BY created_at DESC"
    ).all() as RawRow[]

    const result: DashboardSummary = {
      total,
      processed,
      pendingEvidence,
      anomalous,
      trend,
      alerts: alertRows.map(mapRow),
    }

    res.json(result)
  } catch (error) {
    console.error('Error in GET /summary:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/records', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { type, status, source } = req.query

    let sql = 'SELECT * FROM records WHERE 1=1'
    const params: unknown[] = []

    if (type && typeof type === 'string') {
      sql += ' AND change_type = ?'
      params.push(type)
    }
    if (status && typeof status === 'string') {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (source && typeof source === 'string') {
      sql += ' AND source LIKE ?'
      params.push(`%${source}%`)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params) as RawRow[]
    res.json({ records: rows.map(mapRow), total: rows.length })
  } catch (error) {
    console.error('Error in GET /records:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/records/export', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { type, status, source } = req.query

    let sql = 'SELECT * FROM records WHERE 1=1'
    const params: unknown[] = []

    if (type && typeof type === 'string') {
      sql += ' AND change_type = ?'
      params.push(type)
    }
    if (status && typeof status === 'string') {
      sql += ' AND status = ?'
      params.push(status)
    }
    if (source && typeof source === 'string') {
      sql += ' AND source LIKE ?'
      params.push(`%${source}%`)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params) as RawRow[]
    const data = { records: rows.map(mapRow), total: rows.length }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-export.json"')
    res.json(data)
  } catch (error) {
    console.error('Error in GET /records/export:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.patch('/records/:id/status', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { id } = req.params
    const { status } = req.body as { status: RecordStatus }

    if (!status || !['processed', 'pending', 'anomalous'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status value' })
      return
    }

    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(id) as RawRow | undefined
    if (!record) {
      res.status(404).json({ success: false, error: 'Record not found' })
      return
    }

    const fromStatus = record.status
    if (fromStatus === status) {
      res.json({ success: true })
      return
    }

    const now = new Date().toISOString()
    const logId = `sl_${Date.now()}_${id}`

    const updateStatusAndLog = db.transaction(() => {
      db.prepare('UPDATE records SET status = ? WHERE id = ?').run(status, id)
      db.prepare(
        'INSERT INTO status_log (id, record_id, from_status, to_status, operated_by, operated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(logId, id, fromStatus, status, 'system', now)
    })

    updateStatusAndLog()
    res.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /records/:id/status:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/versions', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const versions = db.prepare('SELECT * FROM versions ORDER BY created_at ASC').all() as Array<{
      version: string; label: string; created_at: string; record_count: number
    }>

    res.json(versions.map(v => ({
      version: v.version,
      label: v.label,
      createdAt: v.created_at,
      recordCount: v.record_count,
    })))
  } catch (error) {
    console.error('Error in GET /versions:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

router.get('/versions/compare', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const fromVersion = req.query.from as string
    const toVersion = req.query.to as string

    if (!fromVersion || !toVersion) {
      res.status(400).json({ success: false, error: 'Missing from or to query parameter' })
      return
    }

    const fromVer = db.prepare('SELECT * FROM versions WHERE version = ?').get(fromVersion) as {
      version: string; label: string; created_at: string; record_count: number
    } | undefined
    const toVer = db.prepare('SELECT * FROM versions WHERE version = ?').get(toVersion) as {
      version: string; label: string; created_at: string; record_count: number
    } | undefined

    if (!fromVer || !toVer) {
      res.status(404).json({ success: false, error: 'Version not found' })
      return
    }

    const fromRecords = db.prepare('SELECT * FROM records WHERE version = ?').all(fromVersion) as RawRow[]
    const toRecords = db.prepare('SELECT * FROM records WHERE version = ?').all(toVersion) as RawRow[]

    const changeTypes: ChangeType[] = ['sample', 'threshold', 'manual', 'metric']

    const diff: VersionCompareResult['diff'] = {
      sample: [],
      threshold: [],
      manual: [],
      metric: [],
    }

    let addedCount = 0
    let removedCount = 0
    let modifiedCount = 0

    for (const ct of changeTypes) {
      const fromBySource = new Map<string, RawRow>()
      for (const r of fromRecords) {
        if (r.change_type === ct) {
          fromBySource.set(r.source, r)
        }
      }

      const toBySource = new Map<string, RawRow>()
      for (const r of toRecords) {
        if (r.change_type === ct) {
          toBySource.set(r.source, r)
        }
      }

      const allSources = new Set([...fromBySource.keys(), ...toBySource.keys()])

      for (const source of allSources) {
        const fromRec = fromBySource.get(source)
        const toRec = toBySource.get(source)

        if (!fromRec && toRec) {
          diff[ct].push({
            id: toRec.id,
            field: source,
            fromValue: null,
            toValue: toRec.current_value,
            changeType: 'added',
          })
          addedCount++
        } else if (fromRec && !toRec) {
          diff[ct].push({
            id: fromRec.id,
            field: source,
            fromValue: fromRec.current_value,
            toValue: null,
            changeType: 'removed',
          })
          removedCount++
        } else if (fromRec && toRec && fromRec.current_value !== toRec.current_value) {
          diff[ct].push({
            id: toRec.id,
            field: source,
            fromValue: fromRec.current_value,
            toValue: toRec.current_value,
            changeType: 'modified',
          })
          modifiedCount++
        }
      }
    }

    const result: VersionCompareResult = {
      from: {
        version: fromVer.version,
        label: fromVer.label,
        createdAt: fromVer.created_at,
        recordCount: fromVer.record_count,
      },
      to: {
        version: toVer.version,
        label: toVer.label,
        createdAt: toVer.created_at,
        recordCount: toVer.record_count,
      },
      diff,
      summary: {
        added: addedCount,
        removed: removedCount,
        modified: modifiedCount,
        total: addedCount + removedCount + modifiedCount,
      },
    }

    res.json(result)
  } catch (error) {
    console.error('Error in GET /versions/compare:', error)
    res.status(500).json({ success: false, error: 'Server internal error' })
  }
})

export default router
