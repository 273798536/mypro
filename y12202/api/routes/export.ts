import { Router, type Request, type Response } from 'express'
import {
  exportApprovalListCsv,
  exportReviewReportCsv,
  exportConsistencyCheckCsv,
  exportRiskFlagsCsv,
} from '../services/export.js'

const router = Router()

function sendCsv(res: Response, csv: string, filename: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
  const bom = '\uFEFF'
  res.send(bom + csv)
}

router.get('/approval-list', (_req: Request, res: Response): void => {
  try {
    const csv = exportApprovalListCsv()
    sendCsv(res, csv, '展期审批列表.csv')
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/review-report', (_req: Request, res: Response): void => {
  try {
    const csv = exportReviewReportCsv()
    sendCsv(res, csv, '审批审查报告.csv')
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/consistency-check', (_req: Request, res: Response): void => {
  try {
    const csv = exportConsistencyCheckCsv()
    sendCsv(res, csv, '一致性检查报告.csv')
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/risk-flags', (_req: Request, res: Response): void => {
  try {
    const csv = exportRiskFlagsCsv()
    sendCsv(res, csv, '风险标记报告.csv')
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
