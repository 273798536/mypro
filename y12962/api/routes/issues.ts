import { Router, type Request, type Response } from 'express'
import { listIssues } from '../repository/issuesRepo.js'
import { traceIssue, summarizeRun } from '../services/trace.js'
import { reviewIssue } from '../services/review.js'
import type { IssueType, IssueStatus, ReviewRequest } from '@shared/types'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const filter: { runId?: string; type?: IssueType; status?: IssueStatus } = {}
  if (typeof req.query.runId === 'string') filter.runId = req.query.runId
  if (typeof req.query.type === 'string') filter.type = req.query.type as IssueType
  if (typeof req.query.status === 'string') filter.status = req.query.status as IssueStatus
  res.json({ success: true, data: listIssues(filter) })
})

router.get('/:issueId', (req: Request, res: Response): void => {
  const id = Number(req.params.issueId)
  if (!Number.isFinite(id)) { res.status(400).json({ success: false, error: '异常 id 非法' }); return }
  const trace = traceIssue(id)
  if (!trace) { res.status(404).json({ success: false, error: '异常不存在' }); return }
  res.json({ success: true, data: trace })
})

router.get('/:issueId/history', (req: Request, res: Response): void => {
  const id = Number(req.params.issueId)
  const trace = traceIssue(id)
  if (!trace) { res.status(404).json({ success: false, error: '异常不存在' }); return }
  res.json({ success: true, data: trace.reviewHistory })
})

router.post('/:issueId/review', (req: Request, res: Response): void => {
  const id = Number(req.params.issueId)
  if (!Number.isFinite(id)) { res.status(400).json({ success: false, error: '异常 id 非法' }); return }
  const body = (req.body ?? {}) as Partial<ReviewRequest>
  const result = reviewIssue(id, {
    reviewer: String(body.reviewer ?? ''),
    action: body.action === 'reject' ? 'reject' : 'approve',
    reason: String(body.reason ?? ''),
  })
  if (!result.ok) { res.status(400).json({ success: false, error: result.message }); return }
  const trace = traceIssue(id)
  res.json({ success: true, data: trace, message: result.message })
})

export default router
