import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { expenditure_id } = req.query
  let delays = db.delays.getAll()
  if (expenditure_id) {
    delays = delays.filter(d => d.expenditure_id === expenditure_id)
  }
  res.json({ success: true, data: delays })
})

router.post('/', (req: Request, res: Response) => {
  const { expenditure_id, original_deadline, new_deadline, reason, impact_description, operator } = req.body
  const delay = db.delays.create({
    expenditure_id,
    original_deadline,
    new_deadline,
    reason,
    impact_description: impact_description || ''
  })
  db.expenditures.update(expenditure_id, { status: 'delayed' })
  db.audit_logs.create({
    entity_type: 'delay',
    entity_id: delay.id,
    action: 'delay_record',
    old_value: JSON.stringify({ deadline: original_deadline }),
    new_value: JSON.stringify({ deadline: new_deadline }),
    operator: operator || '系统',
    impact_description: `项目延期：${reason}，原截止日期${original_deadline}，新截止日期${new_deadline}。影响：${impact_description || '无'}`
  })
  res.json({ success: true, data: delay })
})

export default router
