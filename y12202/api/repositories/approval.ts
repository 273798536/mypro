import db from '../db.js'
import crypto from 'crypto'

export interface ApprovalRecord {
  id: string
  extension_id: string
  approver_name: string
  approver_role: string
  action: string
  opinion: string | null
  created_at: string
  is_immutable: number
}

export interface ApprovalInfluence {
  id: string
  approval_id: string
  influenced_by_approval_id: string
}

export function getApprovalsByExtensionId(extensionId: string): ApprovalRecord[] {
  return db.prepare('SELECT * FROM approval_records WHERE extension_id = ? ORDER BY created_at ASC').all(extensionId) as ApprovalRecord[]
}

export function createApproval(data: Omit<ApprovalRecord, 'id' | 'created_at' | 'is_immutable'>): ApprovalRecord {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO approval_records (id, extension_id, approver_name, approver_role, action, opinion, is_immutable)
    VALUES (@id, @extension_id, @approver_name, @approver_role, @action, @opinion, 1)
  `).run({ id, ...data, opinion: data.opinion ?? null })
  return db.prepare('SELECT * FROM approval_records WHERE id = ?').get(id) as ApprovalRecord
}

export function getLatestApprovalByExtensionId(extensionId: string): ApprovalRecord | undefined {
  return db.prepare('SELECT * FROM approval_records WHERE extension_id = ? ORDER BY created_at DESC LIMIT 1').get(extensionId) as ApprovalRecord | undefined
}

export function getAllApprovals(): ApprovalRecord[] {
  return db.prepare('SELECT * FROM approval_records ORDER BY created_at DESC').all() as ApprovalRecord[]
}

export function createInfluence(data: Omit<ApprovalInfluence, 'id'>): ApprovalInfluence {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO approval_influences (id, approval_id, influenced_by_approval_id)
    VALUES (@id, @approval_id, @influenced_by_approval_id)
  `).run({ id, ...data })
  return db.prepare('SELECT * FROM approval_influences WHERE id = ?').get(id) as ApprovalInfluence
}

export function getInfluencesByApprovalId(approvalId: string): ApprovalInfluence[] {
  return db.prepare('SELECT * FROM approval_influences WHERE approval_id = ?').all(approvalId) as ApprovalInfluence[]
}

export function getInfluencesByInfluencedById(approvalId: string): ApprovalInfluence[] {
  return db.prepare('SELECT * FROM approval_influences WHERE influenced_by_approval_id = ?').all(approvalId) as ApprovalInfluence[]
}
