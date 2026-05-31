import db from '../db.js'
import { getExtensionById } from '../repositories/extension.js'
import {
  getApprovalsByExtensionId,
  getLatestApprovalByExtensionId,
  getAllApprovals,
  getInfluencesByApprovalId,
  getInfluencesByInfluencedById,
  createInfluence,
  type ApprovalRecord,
  type ApprovalInfluence,
} from '../repositories/approval.js'

export interface AuditEntry {
  extension_id: string
  extension_no: number
  contract_id: string
  approval: ApprovalRecord
  influences: ApprovalInfluence[]
}

export interface InfluenceChain {
  approval: ApprovalRecord
  influenced_by: ApprovalRecord[]
  influences: ApprovalRecord[]
}

export function getAuditTrailByExtension(extensionId: string): AuditEntry[] {
  const approvals = getApprovalsByExtensionId(extensionId)
  return approvals.map(approval => {
    const influences = getInfluencesByApprovalId(approval.id)
    return {
      extension_id: extensionId,
      extension_no: 0,
      contract_id: '',
      approval,
      influences,
    }
  })
}

export function getInfluenceChain(approvalId: string): InfluenceChain | null {
  const approval = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(approvalId) as ApprovalRecord | undefined
  if (!approval) return null

  const influencedByRows = getInfluencesByApprovalId(approvalId)
  const influencedBy: ApprovalRecord[] = []
  for (const inf of influencedByRows) {
    const rec = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(inf.influenced_by_approval_id) as ApprovalRecord | undefined
    if (rec) influencedBy.push(rec)
  }

  const influencesRows = getInfluencesByInfluencedById(approvalId)
  const influences: ApprovalRecord[] = []
  for (const inf of influencesRows) {
    const rec = db.prepare('SELECT * FROM approval_records WHERE id = ?').get(inf.approval_id) as ApprovalRecord | undefined
    if (rec) influences.push(rec)
  }

  return { approval, influenced_by: influencedBy, influences }
}

export function getConsistencyCheck(): { extension_id: string; extension_status: string; latest_approval_action: string; mismatch: boolean }[] {
  const extensions = db.prepare('SELECT id, status FROM extension_applications').all() as { id: string; status: string }[]
  return extensions.map(ext => {
    const latestApproval = getLatestApprovalByExtensionId(ext.id)
    const latestAction = latestApproval?.action ?? null
    const expectedStatus = latestAction === 'approve' ? 'approved' : latestAction === 'reject' ? 'rejected' : latestAction
    const mismatch = latestAction !== null && expectedStatus !== ext.status
    return {
      extension_id: ext.id,
      extension_status: ext.status,
      latest_approval_action: latestAction ?? '无审批记录',
      mismatch,
    }
  })
}

export function getAllAuditEntries(): AuditEntry[] {
  const approvals = getAllApprovals()
  return approvals.map(approval => {
    const extension = getExtensionById(approval.extension_id)
    const influences = getInfluencesByApprovalId(approval.id)
    return {
      extension_id: approval.extension_id,
      extension_no: extension?.extension_no ?? 0,
      contract_id: extension?.contract_id ?? '',
      approval,
      influences,
    }
  })
}

export function linkApprovalInfluence(approvalId: string, influencedByApprovalId: string): ApprovalInfluence {
  return createInfluence({ approval_id: approvalId, influenced_by_approval_id: influencedByApprovalId })
}
