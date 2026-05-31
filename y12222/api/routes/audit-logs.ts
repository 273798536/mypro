import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { entity_type, entity_id, limit } = req.query
  let logs = db.audit_logs.getAll()
  if (entity_type) {
    logs = logs.filter(l => l.entity_type === entity_type)
  }
  if (entity_id) {
    logs = logs.filter(l => l.entity_id === entity_id)
  }
  if (limit) {
    logs = logs.slice(0, parseInt(limit as string))
  }
  res.json({ success: true, data: logs })
})

router.get('/entity/:type/:id', (req: Request, res: Response) => {
  const logs = db.audit_logs.getByEntity(req.params.type, req.params.id)
  res.json({ success: true, data: logs })
})

export default router
