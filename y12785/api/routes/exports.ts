import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router({ mergeParams: true })

router.get('/consistency-check', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as any
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const spectra = db.prepare('SELECT * FROM spectrum_pages WHERE batch_id = ? ORDER BY page_number').all(batchId) as any[]
  const attributions = db.prepare('SELECT * FROM fragment_attributions WHERE batch_id = ?').all(batchId) as any[]
  const concentration = db.prepare('SELECT * FROM concentration_results WHERE batch_id = ?').get(batchId) as any
  const temperatures = db.prepare('SELECT * FROM temperature_records WHERE batch_id = ?').all(batchId) as any[]
  const reviews = db.prepare('SELECT * FROM review_records WHERE batch_id = ?').all(batchId) as any[]

  const issues: string[] = []

  if (spectra.length === 0) {
    issues.push('缺少谱图数据')
  } else {
    const pageNumbers = spectra.map(s => s.page_number)
    const maxPage = Math.max(...pageNumbers)
    for (let i = 1; i <= maxPage; i++) {
      if (!pageNumbers.includes(i)) {
        issues.push(`谱图第${i}页缺失`)
      }
    }
  }

  if (attributions.length === 0) {
    issues.push('缺少碎片归因数据')
  }

  if (!concentration) {
    issues.push('缺少浓度换算结果')
  }

  if (temperatures.length === 0) {
    issues.push('缺少温度记录')
  }

  if (reviews.length === 0) {
    issues.push('缺少复核记录')
  }

  const isConsistent = issues.length === 0

  const mismatches = issues.map(issue => ({
    field: issue,
    uiValue: '待确认',
    exportValue: '不完整',
  }))

  res.json({
    success: true,
    data: {
      isConsistent,
      mismatches,
    },
  })
})

router.post('/export', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as any
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const attributions = db.prepare('SELECT * FROM fragment_attributions WHERE batch_id = ?').all(batchId)
  const concentration = db.prepare('SELECT * FROM concentration_results WHERE batch_id = ?').get(batchId)
  const temperatures = db.prepare('SELECT * FROM temperature_records WHERE batch_id = ? ORDER BY timestamp').all(batchId)
  const reviews = db.prepare('SELECT * FROM review_records WHERE batch_id = ? ORDER BY reviewed_at DESC').all(batchId)

  const report = {
    batch: {
      id: batch.id,
      batch_no: batch.batch_no,
      status: batch.status,
      weighing_precision: batch.weighing_precision,
      created_at: batch.created_at,
      updated_at: batch.updated_at,
    },
    attributions,
    concentration,
    temperatures,
    reviews,
    exported_at: new Date().toISOString(),
  }

  logOperation(batchId, 'EXPORT_REPORT', req.body.operator || 'system', '导出报告')

  res.json({ success: true, data: report })
})

export default router
