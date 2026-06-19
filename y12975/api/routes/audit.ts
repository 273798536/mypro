import { Router, type Request, type Response } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { driftId } = req.query
  let sql = 'SELECT a.*, d.table_name as drift_table_name, d.field_name as drift_field_name, d.status as drift_status, m.material_type, m.material_ref, m.title as material_title FROM permission_audit a LEFT JOIN drift_records d ON a.drift_id = d.id LEFT JOIN source_materials m ON a.material_id = m.id WHERE 1=1'
  const params: unknown[] = []

  if (driftId) {
    sql += ' AND a.drift_id = ?'
    params.push(driftId)
  }

  sql += ' ORDER BY a.audit_at DESC'
  const rows = db.prepare(sql).all(...params)
  res.json({ ok: true, data: rows })
})

export default router
