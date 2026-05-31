import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const { status, project } = req.query
  let expenditures = db.expenditures.getAll()
  if (status) {
    expenditures = expenditures.filter(e => e.status === status)
  }
  if (project) {
    expenditures = expenditures.filter(e => e.project_name.includes(project as string))
  }
  res.json({ success: true, data: expenditures })
})

router.get('/:id', (req: Request, res: Response) => {
  const expenditure = db.expenditures.getById(req.params.id)
  if (!expenditure) {
    return res.status(404).json({ success: false, error: '支出申请不存在' })
  }
  const invoices = db.invoices.getByExpenditureId(req.params.id)
  const approvals = db.approvals.getByExpenditureId(req.params.id)
  const opinions = db.opinions.getByExpenditureId(req.params.id)
  const delays = db.delays.getByExpenditureId(req.params.id)
  const disclosures = db.disclosures.getByExpenditureId(req.params.id)
  res.json({
    success: true,
    data: {
      expenditure,
      invoices,
      approvals,
      opinions,
      delays,
      disclosures
    }
  })
})

router.post('/', (req: Request, res: Response) => {
  const { title, amount, project_name, applicant, applicant_role, description } = req.body
  const expenditure = db.expenditures.create({
    title,
    amount,
    project_name,
    applicant,
    applicant_role: applicant_role || '财务人员',
    status: 'draft',
    description: description || ''
  })
  db.audit_logs.create({
    entity_type: 'expenditure',
    entity_id: expenditure.id,
    action: 'create',
    old_value: null,
    new_value: JSON.stringify(expenditure),
    operator: applicant || '系统',
    impact_description: `创建支出申请：${title}`
  })
  res.json({ success: true, data: expenditure })
})

router.put('/:id', (req: Request, res: Response) => {
  const old = db.expenditures.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '支出申请不存在' })
  }
  const expenditure = db.expenditures.update(req.params.id, req.body)
  db.audit_logs.create({
    entity_type: 'expenditure',
    entity_id: req.params.id,
    action: 'update',
    old_value: JSON.stringify(old),
    new_value: JSON.stringify(expenditure),
    operator: req.body.operator || '系统',
    impact_description: `更新支出申请信息`
  })
  res.json({ success: true, data: expenditure })
})

router.patch('/:id/status', (req: Request, res: Response) => {
  const old = db.expenditures.getById(req.params.id)
  if (!old) {
    return res.status(404).json({ success: false, error: '支出申请不存在' })
  }
  const expenditure = db.expenditures.update(req.params.id, { status: req.body.status })
  db.audit_logs.create({
    entity_type: 'expenditure',
    entity_id: req.params.id,
    action: 'status_change',
    old_value: JSON.stringify({ status: old.status }),
    new_value: JSON.stringify({ status: req.body.status }),
    operator: req.body.operator || '系统',
    impact_description: `支出申请状态从 "${old.status}" 变更为 "${req.body.status}"`
  })
  res.json({ success: true, data: expenditure })
})

export default router
