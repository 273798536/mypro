import { Router, type Request, type Response } from 'express'
import { listRuns, getRun, getLatestTwoRuns, listDelayMetrics } from '../repository/runsRepo.js'
import { listIssues, listSchemaDiffsByRun, listIndexSuggestionsByRun } from '../repository/issuesRepo.js'
import { runInspection } from '../services/inspection.js'
import { summarizeRun } from '../services/trace.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  res.json({ success: true, data: listRuns() })
})

router.get('/latest', (_req: Request, res: Response): void => {
  const runs = getLatestTwoRuns()
  const current = runs[0] ?? null
  const previous = runs[1] ?? null
  let currentSummary = null
  if (current) currentSummary = summarizeRun(current.runId)
  res.json({ success: true, data: { current, previous, summary: currentSummary } })
})

router.get('/:runId', (req: Request, res: Response): void => {
  const run = getRun(req.params.runId)
  if (!run) { res.status(404).json({ success: false, error: '运行不存在' }); return }
  res.json({
    success: true,
    data: {
      run,
      delays: listDelayMetrics(run.runId),
      schemaDiffs: listSchemaDiffsByRun(run.runId),
      indexSuggestions: listIndexSuggestionsByRun(run.runId),
      summary: summarizeRun(run.runId),
    },
  })
})

router.get('/:runId/issues', (req: Request, res: Response): void => {
  const run = getRun(req.params.runId)
  if (!run) { res.status(404).json({ success: false, error: '运行不存在' }); return }
  res.json({ success: true, data: listIssues({ runId: run.runId }) })
})

router.post('/', (req: Request, res: Response): void => {
  const sourceDb = (req.body?.sourceDb as string) || 'rw-cluster-prod'
  const result = runInspection(sourceDb)
  res.status(201).json({ success: true, data: result })
})

export default router
