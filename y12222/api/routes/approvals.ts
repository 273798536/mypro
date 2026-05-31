import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { expenditure_id } = req.query
  let approvals = db.approvals.getAll()
  if (expenditure_id) {
    approvals = approvals.filter(a => a.expenditure_id === expenditure_id)
  }
  res.json({ success: true, data: approvals })
})

router.post('/', (req: Request, res: Response) => {
  const { expenditure_id, approver, approver_role, step_order } = req.body
  const approval = db.approvals.create({
    expenditure_id,
    approver,
    approver_role,
    step_order,
    status: 'pending',
    comments: '',
    page_number: null,
    is_complete: false,
    approved_at: null
  })
  db.audit_logs.create({
    entity_type: 'approval',
    entity_id: approval.id,
    action: 'create',
    old_value: null,
    new_value: JSON.stringify(approval),
    operator: approver || '系统',
    impact_description: `创建审批节点：第${step_order}级，审批人${approver}`
  })
  res.json({ success: true, data: approval })
})

router.patch('/:id', (req: Request, res: Response) => {
  const old = db.approvals.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '审批记录不存在' })
  }
  const approval = db.approvals.update(req.params.id, {
    ...req.body,
    approved_at: req.body.status === 'approved' ? new Date().toISOString() : old.approved_at,
    is_complete: req.body.status === 'approved'
  })
  if (req.body.status && req.body.status !== old.status) {
    const statusText = req.body.status === 'page_missing' ? '标记为缺页' : 
                      req.body.status === 'approved' ? '审批通过' :
                      req.body.status === 'rejected' ? '审批驳回' : '待审批'
    db.audit_logs.create({
      entity_type: 'approval',
      entity_id: req.params.id,
      action: 'status_change',
      old_value: JSON.stringify({ status: old.status }),
      new_value: JSON.stringify({ status: req.body.status }),
      operator: req.body.operator || '系统',
      impact_description: `审批节点状态变更为：${statusText}`
    })
  }
  res.json({ success: true, data: approval })
})

export default router
