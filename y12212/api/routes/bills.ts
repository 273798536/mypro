import { Router, type Request, type Response } from 'express'
import { getDb } from '../database/init.js'
import { generateBills, getBills, getBillById, updateBillStatus, recalculateBill } from '../services/billService.js'
import type { Bill, BillStatus, UserCategory } from '../../shared/types.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const { status, user_type, user_category, billing_month, page = '1', pageSize = '20' } = req.query

    const filters: Record<string, string> = {}
    if (status) filters.status = status as string
    if (user_type) filters.user_type = user_type as string
    if (user_category) filters.user_category = user_category as string
    if (billing_month) filters.billing_month = billing_month as string

    let bills = getBills(filters)

    if (user_category) {
      bills = bills.filter(b => b.user_category === (user_category as UserCategory))
    }

    const pageNum = parseInt(page as string, 10)
    const pageSizeNum = parseInt(pageSize as string, 10)
    const total = bills.length
    const start = (pageNum - 1) * pageSizeNum
    const paged = bills.slice(start, start + pageSizeNum)

    res.json({
      success: true,
      data: {
        items: paged,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const bill = getBillById(req.params.id)
    if (!bill) {
      res.status(404).json({ success: false, error: '账单不存在' })
      return
    }
    res.json({ success: true, data: bill })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id/status', (req: Request, res: Response): void => {
  try {
    const { status, reviewedBy, comments } = req.body
    if (!status || !reviewedBy) {
      res.status(400).json({ success: false, error: '状态和审核人不能为空' })
      return
    }

    const validStatuses: BillStatus[] = ['pending', 'reviewing', 'approved', 'rejected', 'exception']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: '无效的账单状态' })
      return
    }

    const bill = updateBillStatus(req.params.id, status, reviewedBy, comments || null)
    if (!bill) {
      res.status(404).json({ success: false, error: '账单不存在' })
      return
    }

    res.json({ success: true, data: bill })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/review', (req: Request, res: Response): void => {
  try {
    const { action, reviewedBy, comments } = req.body
    if (!action || !reviewedBy) {
      res.status(400).json({ success: false, error: '操作类型和审核人不能为空' })
      return
    }

    let status: BillStatus
    switch (action) {
      case 'approve':
        status = 'approved'
        break
      case 'reject':
        status = 'rejected'
        break
      case 'exception':
        status = 'exception'
        break
      default:
        res.status(400).json({ success: false, error: '无效的操作类型，支持: approve, reject, exception' })
        return
    }

    const bill = updateBillStatus(req.params.id, status, reviewedBy, comments || null)
    if (!bill) {
      res.status(404).json({ success: false, error: '账单不存在' })
      return
    }

    res.json({ success: true, data: bill })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/recalculate', (req: Request, res: Response): void => {
  try {
    const bill = recalculateBill(req.params.id)
    if (!bill) {
      res.status(404).json({ success: false, error: '账单不存在' })
      return
    }
    res.json({ success: true, data: bill })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { billingMonth, importTaskId } = req.body
    if (!billingMonth) {
      res.status(400).json({ success: false, error: '账单月份不能为空' })
      return
    }

    const bills = generateBills(billingMonth, importTaskId || null)
    res.json({ success: true, data: bills })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
