import { Router, type Request, type Response } from 'express'
import * as XLSX from 'xlsx'
import db from '../db.js'
import { getLatestVersion } from '../services/allocationService.js'

const router = Router()

interface RawAllocation {
  id: string
  version: string
  card_no: string
  scenic_spot_id: string
  scenic_spot_name: string
  entry_count: number
  base_allocation: number
  subsidy_amount: number
  refund_adjustment: number
  total_allocation: number
  calculated_at: string
}

function getResultsForExport(version?: string): RawAllocation[] {
  const v = version || getLatestVersion()
  if (!v) return []

  return db.prepare(
    'SELECT * FROM allocation_results WHERE version = ? ORDER BY card_no, scenic_spot_id'
  ).all(v) as RawAllocation[]
}

router.get('/excel', (req: Request, res: Response) => {
  try {
    const version = req.query.version as string | undefined
    const rows = getResultsForExport(version)

    const data = rows.map(r => ({
      '年卡号': r.card_no,
      '景点ID': r.scenic_spot_id,
      '景点名称': r.scenic_spot_name,
      '入园次数': r.entry_count,
      '基础分摊': r.base_allocation,
      '补贴金额': r.subsidy_amount,
      '退款调整': r.refund_adjustment,
      '合计分摊': r.total_allocation,
      '版本': r.version,
      '计算时间': r.calculated_at,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    ws['!cols'] = [
      { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 20 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, '分摊结果')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=allocation_${version || 'latest'}.xlsx`)
    res.send(buf)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

router.get('/csv', (req: Request, res: Response) => {
  try {
    const version = req.query.version as string | undefined
    const rows = getResultsForExport(version)

    const data = rows.map(r => ({
      '年卡号': r.card_no,
      '景点ID': r.scenic_spot_id,
      '景点名称': r.scenic_spot_name,
      '入园次数': r.entry_count,
      '基础分摊': r.base_allocation,
      '补贴金额': r.subsidy_amount,
      '退款调整': r.refund_adjustment,
      '合计分摊': r.total_allocation,
      '版本': r.version,
      '计算时间': r.calculated_at,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, '分摊结果')

    const csvContent = XLSX.utils.sheet_to_csv(ws)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=allocation_${version || 'latest'}.csv`)
    res.send('\uFEFF' + csvContent)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
