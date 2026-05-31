import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { expenditure_id } = req.query
  let opinions = db.opinions.getAll()
  if (expenditure_id) {
    opinions = opinions.filter(o => o.expenditure_id === expenditure_id)
  }
  res.json({ success: true, data: opinions })
})

router.post('/', (req: Request, res: Response) => {
  const { expenditure_id, resident_name, opinion, source_type, approval_id } = req.body
  const residentOpinion = db.opinions.create({
    expenditure_id,
    resident_name,
    opinion,
    source_type: source_type || 'written',
    approval_id: approval_id || null
  })
  db.audit_logs.create({
    entity_type: 'opinion',
    entity_id: residentOpinion.id,
    action: 'create',
    old_value: null,
    new_value: JSON.stringify(residentOpinion),
    operator: resident_name || '居民',
    impact_description: `居民 ${resident_name} 提交意见`
  })
  res.json({ success: true, data: residentOpinion })
})

export default router
