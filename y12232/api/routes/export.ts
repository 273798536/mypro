import { Router, type Request, type Response } from 'express'
import { generateReport, generateList, getExportFilePath } from '../services/export.js'
import path from 'path'
import fs from 'fs'

const router = Router()

router.post('/report', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await generateReport()
    res.json({ success: true, data: { filename: result.filename } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '生成报告失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.post('/list', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await generateList()
    res.json({ success: true, data: { filename: result.filename } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '导出清单失败'
    res.status(500).json({ success: false, error: message })
  }
})

router.get('/:filename', (req: Request, res: Response): void => {
  try {
    const { filename } = req.params
    const filepath = getExportFilePath(filename)

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ success: false, error: '文件不存在' })
      return
    }

    res.download(filepath, filename)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '下载文件失败'
    res.status(500).json({ success: false, error: message })
  }
})

export default router
