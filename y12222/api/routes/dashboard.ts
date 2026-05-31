import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  const expenditures = db.expenditures.getAll()
  const invoices = db.invoices.getAll()
  const approvals = db.approvals.getAll()
  const delays = db.delays.getAll()
  const disclosures = db.disclosures.getAll()
  
  const totalAmountThisMonth = expenditures
    .filter(e => e.created_at.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0)
  
  const pendingApprovalCount = approvals.filter(a => a.status === 'pending').length
  
  const duplicateCount = invoices.filter(i => i.duplicate_status === 'confirmed' || i.duplicate_status === 'suspected').length
  
  const missingPageCount = approvals.filter(a => a.status === 'page_missing').length
  
  const delayCount = delays.length
  
  const publishingCount = disclosures.filter(d => d.status === 'published').length
  
  const recentChanges = db.audit_logs.getAll().slice(0, 10)
  
  res.json({
    success: true,
    data: {
      total_amount_this_month: totalAmountThisMonth,
      pending_approval_count: pendingApprovalCount,
      anomaly_count: {
        duplicates: duplicateCount,
        missing_pages: missingPageCount,
        delays: delayCount
      },
      publishing_count: publishingCount,
      recent_changes: recentChanges
    }
  })
})

export default router
