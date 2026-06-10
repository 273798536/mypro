import { Router } from 'express'
import { getCases, loadDemoCase } from '../services/dataService.js'
import type { DemoCase } from '../../shared/types/index.js'

const router = Router()

router.get('/cases', async (req, res) => {
  try {
    const cases: DemoCase[] = await getCases()
    res.json({ success: true, data: cases })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/load/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params
    const affectedCount = await loadDemoCase(String(caseId))
    res.json({ success: true, data: { loaded: true, affectedCount } })  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
