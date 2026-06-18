import { withTransaction } from '../db/database.js'
import { getIssue, updateIssueStatus, createReviewHistory } from '../repository/issuesRepo.js'
import type { ReviewRequest, IssueStatus } from '@shared/types'

export function reviewIssue(issueId: number, body: ReviewRequest): { ok: boolean; message: string } {
  const issue = getIssue(issueId)
  if (!issue) return { ok: false, message: '异常不存在' }
  if (!body.reviewer || !body.reviewer.trim()) return { ok: false, message: '复核人不能为空' }
  if (!body.reason || !body.reason.trim()) return { ok: false, message: '复核理由不能为空（需记录为什么改）' }
  if (body.action !== 'approve' && body.action !== 'reject') return { ok: false, message: '动作必须为 approve 或 reject' }

  const newStatus: IssueStatus = body.action === 'approve' ? 'approved' : 'rejected'
  withTransaction(() => {
    const prev = issue.status as IssueStatus | null
    updateIssueStatus(issueId, newStatus)
    createReviewHistory({
      issueId,
      reviewer: body.reviewer.trim(),
      action: body.action,
      reason: body.reason.trim(),
      previousStatus: prev,
    })
  })
  return { ok: true, message: newStatus === 'approved' ? '已通过，审计已记录' : '已驳回，审计已记录' }
}
