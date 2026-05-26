import express from 'express'
import {
  calculateBatchRefunds,
  getRules,
  createRule,
  updateRule,
  getChannelConfigs,
} from '../services/calculationService'

const router = express.Router()

const OPERATOR = 'admin'

router.post('/calculate', async (req, res) => {
  try {
    const { participantIds, ruleId } = req.body
    const result = await calculateBatchRefunds(participantIds, ruleId, OPERATOR)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/rules', async (_req, res) => {
  try {
    const rules = await getRules()
    res.json(rules)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.post('/rules', async (req, res) => {
  try {
    const rule = await createRule(req.body)
    res.json(rule)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.put('/rules/:id', async (req, res) => {
  try {
    const rule = await updateRule(req.params.id, req.body)
    res.json(rule)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

router.get('/channels', async (_req, res) => {
  try {
    const channels = await getChannelConfigs()
    res.json(channels)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export default router
