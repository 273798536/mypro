import * as XLSX from 'xlsx'
import { writeFileSync } from 'fs'
import { getDb } from '../database/init.js'
import type { Bill, BillDetail, BillException, BillStatus } from '../../shared/types.js'
import {
  USER_TYPE_LABELS,
  USER_CATEGORY_LABELS,
  BILL_STATUS_LABELS,
  EXCEPTION_TYPE_LABELS,
} from '../../shared/types.js'
import {
  generateBillReviewExplanation,
  generateBatchSummary,
  generateExceptionSummary,
} from './humanReadable.js'

interface ReportFilters {
  billing_month?: string
  user_type?: string
  status?: BillStatus
  combined_group_id?: string
}

export interface DetailReportItem {
  bill: Bill
  user_name: string
  details: BillDetail[]
  exceptions: BillException[]
  human_readable: string
}

export interface ExceptionReportItem {
  bill: Bill
  user_name: string
  exceptions: BillException[]
  human_readable: string
}

export interface SummaryReport {
  billing_month: string
  total_bills: number
  total_amount: number
  by_status: Record<string, number>
  by_type: Record<string, { count: number; amount: number }>
  exception_count: number
  human_readable: string
}

export function generateDetailReport(filters: ReportFilters = {}): DetailReportItem[] {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.billing_month) {
    conditions.push('billing_month = ?')
    params.push(filters.billing_month)
  }
  if (filters.user_type) {
    conditions.push('user_type = ?')
    params.push(filters.user_type)
  }
  if (filters.status) {
    conditions.push('status = ?')
    params.push(filters.status)
  }
  if (filters.combined_group_id) {
    conditions.push('combined_group_id = ?')
    params.push(filters.combined_group_id)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const bills = db.prepare(`SELECT * FROM bill ${where} ORDER BY created_at DESC`).all(...params) as Bill[]

  return bills.map(bill => {
    const profile = db.prepare('SELECT name FROM user_profile WHERE user_no = ?').get(bill.user_no) as { name: string } | undefined
    const details = db.prepare('SELECT * FROM bill_detail WHERE bill_id = ?').all(bill.id) as BillDetail[]
    const exceptions = db.prepare('SELECT * FROM bill_exception WHERE bill_id = ?').all(bill.id) as BillException[]

    const userProfile = db.prepare('SELECT * FROM user_profile WHERE user_no = ?').get(bill.user_no) as { name: string; discount_rate: number | null; discount_expire_date: string | null }
    const humanReadable = generateBillReviewExplanation(
      bill,
      { ...userProfile, id: '', user_no: bill.user_no, name: userProfile.name, user_type: bill.user_type, user_category: bill.user_category, combined_group_id: bill.combined_group_id, population: null, area: null, address: '', contact: null, discount_rate: userProfile.discount_rate, discount_expire_date: userProfile.discount_expire_date, created_at: '' },
      details,
      exceptions
    )

    return {
      bill,
      user_name: profile?.name || '',
      details,
      exceptions,
      human_readable: humanReadable,
    }
  })
}

export function generateExceptionReport(filters: ReportFilters = {}): ExceptionReportItem[] {
  const db = getDb()
  const conditions: string[] = ['b.status = \'exception\'']
  const params: unknown[] = []

  if (filters.billing_month) {
    conditions.push('b.billing_month = ?')
    params.push(filters.billing_month)
  }
  if (filters.user_type) {
    conditions.push('b.user_type = ?')
    params.push(filters.user_type)
  }
  if (filters.combined_group_id) {
    conditions.push('b.combined_group_id = ?')
    params.push(filters.combined_group_id)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const bills = db.prepare(`SELECT b.* FROM bill b ${where} ORDER BY b.created_at DESC`).all(...params) as Bill[]

  return bills.map(bill => {
    const profile = db.prepare('SELECT name FROM user_profile WHERE user_no = ?').get(bill.user_no) as { name: string } | undefined
    const exceptions = db.prepare('SELECT * FROM bill_exception WHERE bill_id = ?').all(bill.id) as BillException[]

    const humanReadable = generateExceptionSummary(exceptions)

    return {
      bill,
      user_name: profile?.name || '',
      exceptions,
      human_readable: humanReadable,
    }
  })
}

export function generateSummaryReport(filters: ReportFilters = {}): SummaryReport {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.billing_month) {
    conditions.push('billing_month = ?')
    params.push(filters.billing_month)
  }
  if (filters.user_type) {
    conditions.push('user_type = ?')
    params.push(filters.user_type)
  }
  if (filters.combined_group_id) {
    conditions.push('combined_group_id = ?')
    params.push(filters.combined_group_id)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const bills = db.prepare(`SELECT * FROM bill ${where}`).all(...params) as Bill[]

  const totalBills = bills.length
  const totalAmount = bills.reduce((sum, b) => sum + b.calculated_amount, 0)

  const byStatus: Record<string, number> = {}
  for (const bill of bills) {
    const label = BILL_STATUS_LABELS[bill.status] || bill.status
    byStatus[label] = (byStatus[label] || 0) + 1
  }

  const byType: Record<string, { count: number; amount: number }> = {}
  for (const bill of bills) {
    const label = USER_TYPE_LABELS[bill.user_type] || bill.user_type
    if (!byType[label]) byType[label] = { count: 0, amount: 0 }
    byType[label].count++
    byType[label].amount += bill.calculated_amount
  }

  const exceptionCount = bills.filter(b => b.status === 'exception').length
  const approvedCount = bills.filter(b => b.status === 'approved').length
  const rejectedCount = bills.filter(b => b.status === 'rejected').length

  const billingMonth = filters.billing_month || '全部'

  const humanReadable = generateBatchSummary(
    billingMonth, totalBills, totalAmount, exceptionCount, approvedCount, rejectedCount
  )

  return {
    billing_month: billingMonth,
    total_bills: totalBills,
    total_amount: Math.round(totalAmount * 100) / 100,
    by_status: byStatus,
    by_type: byType,
    exception_count: exceptionCount,
    human_readable: humanReadable,
  }
}

export function exportToExcel(reportData: DetailReportItem[] | ExceptionReportItem[] | SummaryReport, filePath: string): string {
  const wb = XLSX.utils.book_new()

  if ('total_bills' in reportData) {
    const summary = reportData as SummaryReport
    const wsData = [
      ['指标', '数值'],
      ['账单月份', summary.billing_month],
      ['总账单数', summary.total_bills],
      ['总金额', summary.total_amount],
      ['异常数', summary.exception_count],
      ['', ''],
      ['状态统计', ''],
      ...Object.entries(summary.by_status).map(([k, v]) => [k, v]),
      ['', ''],
      ['类型统计', '数量', '金额'],
      ...Object.entries(summary.by_type).map(([k, v]) => [k, v.count, v.amount]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, '汇总')
  } else {
    const items = reportData as DetailReportItem[]
    if (items.length > 0 && 'details' in items[0]) {
      const detailItems = items as DetailReportItem[]
      const wsData = detailItems.map(item => ({
        '用户编号': item.bill.user_no,
        '用户姓名': item.user_name,
        '用户类型': USER_TYPE_LABELS[item.bill.user_type],
        '账单月份': item.bill.billing_month,
        '用水量(吨)': item.bill.total_usage,
        '计算金额(元)': item.bill.calculated_amount,
        '状态': BILL_STATUS_LABELS[item.bill.status],
        '异常数': item.exceptions.length,
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, '账单明细')
    } else {
      const exItems = items as ExceptionReportItem[]
      const wsData = exItems.map(item => ({
        '用户编号': item.bill.user_no,
        '用户姓名': item.user_name,
        '账单月份': item.bill.billing_month,
        '异常数': item.exceptions.length,
        '异常说明': item.exceptions.map(e => e.human_readable).join('; '),
      }))
      const ws = XLSX.utils.json_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, '异常报告')
    }
  }

  XLSX.writeFile(wb, filePath)
  return filePath
}

function buildPdfContent(reportData: DetailReportItem[] | ExceptionReportItem[] | SummaryReport): string {
  if ('total_bills' in reportData) {
    return (reportData as SummaryReport).human_readable
  }
  const items = reportData as DetailReportItem[] | ExceptionReportItem[]
  return items.map(item => item.human_readable).join('\n\n' + '='.repeat(60) + '\n\n')
}

export function exportToPdf(reportData: DetailReportItem[] | ExceptionReportItem[] | SummaryReport, filePath: string): string {
  const content = buildPdfContent(reportData)
  const lines = content.split('\n')

  let objects: string[] = []
  let currentY = 760
  const lineHeight = 16
  const maxLinesPerPage = Math.floor(700 / lineHeight)
  const pages: string[] = []

  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    const pageLines = lines.slice(i, i + maxLinesPerPage)
    let stream = 'BT\n/F1 10 Tf\n'
    let y = 760
    for (const line of pageLines) {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
      stream += `1 0 0 1 40 ${y} Tm\n(${escaped}) Tj\n`
      y -= lineHeight
    }
    stream += 'ET'
    pages.push(stream)
  }

  if (pages.length === 0) {
    pages.push('BT\n/F1 10 Tf\n1 0 0 1 40 760 Tm\n(No data) Tj\nET')
  }

  const catalogKids: string[] = []
  let objIndex = 1

  const catalogObjRef = objIndex++
  const pagesObjRef = objIndex++
  const fontObjRef = objIndex++
  const pageObjRefs: number[] = []
  const contentObjRefs: number[] = []

  for (let i = 0; i < pages.length; i++) {
    pageObjRefs.push(objIndex++)
    contentObjRefs.push(objIndex++)
  }

  const offsets: number[] = []
  let pdf = '%PDF-1.4\n'

  function addObj(content: string): void {
    offsets.push(Buffer.byteLength(pdf, 'binary'))
    pdf += `${offsets.length} 0 obj\n${content}\nendobj\n`
  }

  addObj(`<< /Type /Catalog /Pages ${pagesObjRef} 0 R >>`)

  const kidsStr = pageObjRefs.map(r => `${r} 0 R`).join(' ')
  addObj(`<< /Type /Pages /Kids [${kidsStr}] /Count ${pages.length} >>`)

  addObj(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`)

  for (let i = 0; i < pages.length; i++) {
    addObj(`<< /Type /Page /Parent ${pagesObjRef} 0 R /MediaBox [0 0 612 792] /Contents ${contentObjRefs[i]} 0 R /Resources << /Font << /F1 ${fontObjRef} 0 R >> >> >>`)
  }

  for (let i = 0; i < pages.length; i++) {
    const streamContent = pages[i]
    const streamBytes = Buffer.from(streamContent, 'binary')
    addObj(`<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream`)
  }

  const xrefOffset = Buffer.byteLength(pdf, 'binary')
  pdf += 'xref\n'
  pdf += `0 ${offsets.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (const offset of offsets) {
    pdf += offset.toString().padStart(10, '0') + ' 00000 n \n'
  }

  pdf += 'trailer\n'
  pdf += `<< /Size ${offsets.length + 1} /Root ${catalogObjRef} 0 R >>\n`
  pdf += 'startxref\n'
  pdf += `${xrefOffset}\n`
  pdf += '%%EOF'

  writeFileSync(filePath, pdf, 'binary')
  return filePath
}
