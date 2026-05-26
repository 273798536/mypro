import express from 'express'
import {
  exportRefundDetails,
  exportAllocationReport,
  getExportRecords,
  getExportFilePath,
} from '../services/exportService'

const router = express.Router()

const OPERATOR = 'admin'

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query
    const result = await getExportRecords(Number(page), Number(pageSize))
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/refund-details', async (req, res) => {
  try {
    const { batchId, filters } = req.body
    const record = await exportRefundDetails(batchId || null, filters || {}, OPERATOR)
    res.status(201).json(record)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/allocation-report', async (req, res) => {
  try {
    const { batchId } = req.body
    const record = await exportAllocationReport(batchId, OPERATOR)
    res.status(201).json(record)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id/download', async (req, res) => {
  try {
    const filePath = await getExportFilePath(req.params.id)
    if (!filePath) {
      return res.status(404).json({ error: '文件不存在' })
    }
    res.download(filePath)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
