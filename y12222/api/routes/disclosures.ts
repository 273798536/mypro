import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { expenditure_id, status } = req.query
  let disclosures = db.disclosures.getAll()
  if (expenditure_id) {
    disclosures = disclosures.filter(d => d.expenditure_id === expenditure_id)
  }
  if (status) {
    disclosures = disclosures.filter(d => d.status === status)
  }
  res.json({ success: true, data: disclosures })
})

router.get('/:id', (req: Request, res: Response) => {
  const disclosure = db.disclosures.getById(req.params.id)
  if (!disclosure) {
    return res.status(404).json({ success: false, error: '公示记录不存在' })
  }
  res.json({ success: true, data: disclosure })
})

router.post('/', (req: Request, res: Response) => {
  const { expenditure_id, disclosure_date, end_date, public_notice_content } = req.body
  const disclosure = db.disclosures.create({
    expenditure_id,
    disclosure_date,
    end_date,
    status: 'draft',
    public_notice_content: public_notice_content || ''
  })
  db.audit_logs.create({
    entity_type: 'disclosure',
    entity_id: disclosure.id,
    action: 'create',
    old_value: null,
    new_value: JSON.stringify(disclosure),
    operator: req.body.operator || '系统',
    impact_description: `创建公示记录，开始日期${disclosure_date}，结束日期${end_date}`
  })
  res.json({ success: true, data: disclosure })
})

router.patch('/:id/status', (req: Request, res: Response) => {
  const old = db.disclosures.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '公示记录不存在' })
  }
  const disclosure = db.disclosures.update(req.params.id, { status: req.body.status })
  const statusText = req.body.status === 'published' ? '已发布' : 
                    req.body.status === 'ended' ? '已结束' : '草稿'
  db.audit_logs.create({
    entity_type: 'disclosure',
    entity_id: req.params.id,
    action: 'status_change',
    old_value: JSON.stringify({ status: old.status }),
    new_value: JSON.stringify({ status: req.body.status }),
    operator: req.body.operator || '系统',
    impact_description: `公示状态变更为：${statusText}`
  })
  res.json({ success: true, data: disclosure })
})

export default router
