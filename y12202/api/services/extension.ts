import db from '../db.js'
import {
  getExtensions,
  getExtensionById,
  getExtensionCountByContractId,
  createExtension,
  updateExtension,
  deleteExtension,
  getMaterialsByExtensionId,
  createMaterial,
  deleteMaterial,
  type ExtensionApplication,
  type Material,
} from '../repositories/extension.js'
import { getContractById } from '../repositories/contract.js'
import { createApproval } from '../repositories/approval.js'
import { detectRisks } from './risk-detection.js'

export interface ExtensionDetail {
  extension: ExtensionApplication
  materials: Material[]
}

export function listExtensions(filters?: { contract_id?: string; status?: string }): ExtensionApplication[] {
  return getExtensions(filters)
}

export function getExtensionDetail(id: string): ExtensionDetail | null {
  const extension = getExtensionById(id)
  if (!extension) return null
  const materials = getMaterialsByExtensionId(id)
  return { extension, materials }
}

export function createDraft(data: {
  contract_id: string
  original_end_date: string
  new_end_date: string
  extension_reason: string
  created_by: string
}): ExtensionApplication {
  const count = getExtensionCountByContractId(data.contract_id)
  return createExtension({
    contract_id: data.contract_id,
    extension_no: count + 1,
    original_end_date: data.original_end_date,
    new_end_date: data.new_end_date,
    extension_reason: data.extension_reason,
    status: 'draft',
    created_by: data.created_by,
    submitted_at: null,
  })
}

export function autoSave(id: string, data: { new_end_date?: string; extension_reason?: string }): ExtensionApplication | null {
  const existing = getExtensionById(id)
  if (!existing) return null
  if (existing.status !== 'draft') return null
  return updateExtension(id, data)
}

export function submitExtension(id: string): { extension: ExtensionApplication; risks: ReturnType<typeof detectRisks> } | null {
  const existing = getExtensionById(id)
  if (!existing) return null
  if (existing.status !== 'draft') return null

  const now = new Date().toISOString()
  const updated = updateExtension(id, { status: 'submitted', submitted_at: now })
  if (!updated) return null

  const risks = detectRisks(id)

  return { extension: updated, risks }
}

export function approveExtension(id: string, approver_name: string, approver_role: string, opinion: string | null): ExtensionApplication | null {
  const existing = getExtensionById(id)
  if (!existing) return null
  if (existing.status !== 'submitted') return null

  const doApprove = db.transaction(() => {
    updateExtension(id, { status: 'approved' })
    createApproval({
      extension_id: id,
      approver_name,
      approver_role,
      action: 'approve',
      opinion,
    })
    db.prepare('UPDATE contracts SET end_date = ? WHERE id = ?').run(existing.new_end_date, existing.contract_id)
  })

  doApprove()
  return getExtensionById(id)
}

export function rejectExtension(id: string, approver_name: string, approver_role: string, opinion: string | null): ExtensionApplication | null {
  const existing = getExtensionById(id)
  if (!existing) return null
  if (existing.status !== 'submitted') return null

  const doReject = db.transaction(() => {
    updateExtension(id, { status: 'rejected' })
    createApproval({
      extension_id: id,
      approver_name,
      approver_role,
      action: 'reject',
      opinion,
    })
  })

  doReject()
  return getExtensionById(id)
}

export function addMaterial(extensionId: string, data: { name: string; type: string; category: string; source_person: string }): Material | null {
  const existing = getExtensionById(extensionId)
  if (!existing) return null
  return createMaterial({ extension_id: extensionId, ...data })
}

export function removeMaterial(id: string): boolean {
  return deleteMaterial(id)
}

export function removeExtension(id: string): boolean {
  const existing = getExtensionById(id)
  if (!existing) return false
  if (existing.status !== 'draft') return false
  return deleteExtension(id)
}
