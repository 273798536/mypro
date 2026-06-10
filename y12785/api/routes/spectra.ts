import { Router, type Request, type Response } from 'express'
import db, { logOperation } from '../db.js'

const router = Router({ mergeParams: true })

router.post('/', (req: Request, res: Response): void => {
  const { batchId } = req.params
  const { page_number, file_name, file_path, data } = req.body

  if (!page_number || !file_name || !data) {
    res.status(400).json({
      code: 'MISSING_FIELD',
      message: '缺少必填字段',
      actionableHint: '请提供 page_number, file_name, data 字段',
      missingData: ['page_number', 'file_name', 'data'].filter(f => !(f in req.body)),
    })
    return
  }

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const existing = db.prepare('SELECT id FROM spectrum_pages WHERE batch_id = ? AND page_number = ?').get(batchId, page_number)
  if (existing) {
    res.status(409).json({
      code: 'DUPLICATE_PAGE',
      message: '该页码谱图已存在',
      actionableHint: '请使用不同的页码或删除已有记录',
    })
    return
  }

  const id = crypto.randomUUID()
  db.prepare(
    'INSERT INTO spectrum_pages (id, batch_id, page_number, file_name, file_path, data) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, batchId, page_number, file_name, file_path || '', typeof data === 'string' ? data : JSON.stringify(data))

  logOperation(batchId, 'UPLOAD_SPECTRUM', req.body.operator || 'system', `上传谱图第${page_number}页: ${file_name}`)

  const page = db.prepare('SELECT * FROM spectrum_pages WHERE id = ?').get(id)
  res.status(201).json({ success: true, data: page })
})

router.get('/', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId)
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const pages = db.prepare('SELECT * FROM spectrum_pages WHERE batch_id = ? ORDER BY page_number').all(batchId)
  res.json({ success: true, data: pages })
})

router.get('/check', (req: Request, res: Response): void => {
  const { batchId } = req.params

  const batch = db.prepare('SELECT id FROM batches WHERE id = ?').get(batchId) as any
  if (!batch) {
    res.status(404).json({
      code: 'BATCH_NOT_FOUND',
      message: '批次不存在',
      actionableHint: '请检查批次ID是否正确',
    })
    return
  }

  const pages = db.prepare('SELECT page_number FROM spectrum_pages WHERE batch_id = ? ORDER BY page_number').all(batchId) as any[]

  if (pages.length === 0) {
    res.json({
      success: true,
      data: { complete: false, totalPages: 0, uploadedPages: [], missingPages: [] },
    })
    return
  }

  const pageNumbers = pages.map(p => p.page_number)
  const maxPage = Math.max(...pageNumbers)
  const missingPages: number[] = []
  for (let i = 1; i <= maxPage; i++) {
    if (!pageNumbers.includes(i)) {
      missingPages.push(i)
    }
  }

  if (missingPages.length > 0) {
    res.json({
      success: true,
      data: {
        complete: false,
        totalPages: maxPage,
        uploadedPages: pageNumbers,
        missingPages,
      },
      error: {
        code: 'SPECTRA_INCOMPLETE',
        message: '谱图数据不完整',
        actionableHint: '请补充以下缺失页面的谱图数据',
        missingData: missingPages.map(p => `第${p}页`),
      },
    })
    return
  }

  res.json({
    success: true,
    data: { complete: true, totalPages: maxPage, uploadedPages: pageNumbers, missingPages: [] },
  })
})

export default router
