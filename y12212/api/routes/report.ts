import { Router, type Request, type Response } from 'express'
import path from 'path'
import { mkdirSync } from 'fs'
import { generateDetailReport, generateExceptionReport, generateSummaryReport, exportToExcel, exportToPdf } from '../services/reportService.js'
import type { DetailReportItem, ExceptionReportItem, SummaryReport } from '../services/reportService.js'
import type { BillStatus } from '../../shared/types.js'

type ReportData = DetailReportItem[] | ExceptionReportItem[] | SummaryReport

const router = Router()

router.get('/preview', (req: Request, res: Response): void => {
  try {
    const { type, billingMonth, userType } = req.query

    const filters: { billing_month?: string; user_type?: string; status?: BillStatus } = {}
    if (billingMonth) filters.billing_month = billingMonth as string
    if (userType) filters.user_type = userType as string

    let data: ReportData
    switch (type) {
      case 'detail':
        data = generateDetailReport(filters)
        break
      case 'exception':
        data = generateExceptionReport(filters)
        break
      case 'summary':
        data = generateSummaryReport(filters)
        break
      default:
        res.status(400).json({ success: false, error: '报表类型无效，支持: detail, exception, summary' })
        return
    }

    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/export', (req: Request, res: Response): void => {
  try {
    const { type, format, filters = {} } = req.body

    if (!type || !format) {
      res.status(400).json({ success: false, error: '报表类型和导出格式不能为空' })
      return
    }

    const reportFilters: { billing_month?: string; user_type?: string } = {}
    if (filters.billingMonth) reportFilters.billing_month = filters.billingMonth
    if (filters.userType) reportFilters.user_type = filters.userType

    let reportData: ReportData
    switch (type) {
      case 'detail':
        reportData = generateDetailReport(reportFilters)
        break
      case 'exception':
        reportData = generateExceptionReport(reportFilters)
        break
      case 'summary':
        reportData = generateSummaryReport(reportFilters)
        break
      default:
        res.status(400).json({ success: false, error: '报表类型无效' })
        return
    }

    const outputDir = path.join(process.cwd(), 'exports')
    mkdirSync(outputDir, { recursive: true })

    const timestamp = Date.now()
    let filePath: string

    if (format === 'excel') {
      filePath = path.join(outputDir, `report_${type}_${timestamp}.xlsx`)
      exportToExcel(reportData, filePath)
    } else if (format === 'pdf') {
      filePath = path.join(outputDir, `report_${type}_${timestamp}.pdf`)
      exportToPdf(reportData, filePath)
    } else {
      res.status(400).json({ success: false, error: '导出格式无效，支持: excel, pdf' })
      return
    }

    const fileName = path.basename(filePath)
    res.json({ success: true, data: { filePath: fileName } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
