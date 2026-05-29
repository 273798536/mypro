import express from 'express'
import {
  getBatches,
  getBatch,
  createBatch,
  freezeBatch,
  unfreezeBatch,
  executeBatch,
  confirmBatch,
} from '../services/batchService'

const router = express.Router()

const OPERATOR = 'admin'

router.get('/', async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query
    const result = await getBatches(status as string, Number(page), Number(pageSize))
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const batch = await getBatch(req.params.id)
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' })
    }
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/', async (req, res) => {
  try {
    const batch = await createBatch(req.body, OPERATOR)
    res.status(201).json(batch)
  } catch (error) {
    if ((error as Error).message.includes('已在其他活跃批次中')) {
      return res.status(400).json({ error: (error as Error).message })
    }
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/:id/freeze', async (req, res) => {
  try {
    const batch = await freezeBatch(req.params.id, OPERATOR)
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/:id/unfreeze', async (req, res) => {
  try {
    const batch = await unfreezeBatch(req.params.id, OPERATOR)
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/:id/execute', async (req, res) => {
  try {
    const batch = await executeBatch(req.params.id, OPERATOR)
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/:id/confirm', async (req, res) => {
  try {
    const batch = await confirmBatch(req.params.id, OPERATOR)
    res.json(batch)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
