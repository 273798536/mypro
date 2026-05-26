import express from 'express'
import {
  getParticipants,
  getParticipant,
  updateParticipant,
  getStats,
  getTiers,
} from '../services/participantService'
import { getParticipantHistory } from '../services/auditService'

const router = express.Router()

const OPERATOR = 'admin'

router.get('/', async (req, res) => {
  try {
    const { tierId, payChannel, status, hasAnomalies, search, page = 1, pageSize = 50 } = req.query

    const result = await getParticipants(
      {
        tierId: tierId as string,
        payChannel: payChannel as string,
        status: status as string,
        hasAnomalies: hasAnomalies === 'true',
        search: search as string,
      },
      Number(page),
      Number(pageSize)
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/tiers', async (_req, res) => {
  try {
    const tiers = await getTiers()
    res.json(tiers)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const participant = await getParticipant(req.params.id)
    if (!participant) {
      return res.status(404).json({ error: '参与人不存在' })
    }
    res.json(participant)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const participant = await updateParticipant(req.params.id, req.body, OPERATOR)
    res.json(participant)
  } catch (error) {
    if ((error as Error).message.includes('数据已被修改')) {
      return res.status(409).json({ error: (error as Error).message })
    }
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/:id/history', async (req, res) => {
  try {
    const history = await getParticipantHistory(req.params.id)
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
