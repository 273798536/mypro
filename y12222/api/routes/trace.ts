import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/:expenditure_id', (req: Request, res: Response) => {
  const { expenditure_id } = req.params
  
  const expenditure = db.expenditures.getById(expenditure_id)
  if (!expenditure) {
    return res.status(404).json({ success: false, error: '支出申请不存在' })
  }
  
  const invoices = db.invoices.getByExpenditureId(expenditure_id)
  const approvals = db.approvals.getByExpenditureId(expenditure_id)
  const opinions = db.opinions.getByExpenditureId(expenditure_id)
  const delays = db.delays.getByExpenditureId(expenditure_id)
  const disclosures = db.disclosures.getByExpenditureId(expenditure_id)
  const audit_logs = db.audit_logs.getByEntity('expenditure', expenditure_id)
  
  const duplicateInvoices = invoices.filter(i => 
    i.duplicate_status === 'confirmed' || i.duplicate_status === 'suspected'
  )
  
  const missingPageApprovals = approvals.filter(a => a.status === 'page_missing')
  
  res.json({
    success: true,
    data: {
      expenditure,
      invoices,
      approvals,
      opinions,
      delays,
      disclosures,
      audit_logs,
      anomalies: {
        duplicates: duplicateInvoices,
        missing_pages: missingPageApprovals,
        delays
      }
    }
  })
})

export default router
