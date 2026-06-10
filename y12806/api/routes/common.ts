import { Router } from 'express'
import { getSamples, getRuns, getSites, getLogs } from '../services/dataService.js'

const router = Router()

router.get('/samples', async (_req, res) => {
  try {
    const samples = await getSamples()
    res.json({ success: true, data: samples })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/analysis-runs', async (_req, res) => {
  try {
    const runs = await getRuns()
    res.json({ success: true, data: runs })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/sampling-sites', async (_req, res) => {
  try {
    const sites = await getSites()
    res.json({ success: true, data: sites })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/review-logs', async (_req, res) => {
  try {
    const logs = await getLogs()
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
