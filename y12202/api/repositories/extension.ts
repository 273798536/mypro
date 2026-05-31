import db from '../db.js'
import crypto from 'crypto'

export interface ExtensionApplication {
  id: string
  contract_id: string
  extension_no: number
  original_end_date: string
  new_end_date: string
  extension_reason: string
  status: string
  created_at: string
  created_by: string
  submitted_at: string | null
}

export interface Material {
  id: string
  extension_id: string
  name: string
  type: string
  category: string
  source_person: string
  uploaded_at: string
}

export interface RiskFlag {
  id: string
  extension_id: string
  type: string
  severity: string
  description: string
  related_entity_id: string | null
  detected_at: string
}

export function getExtensions(filters?: { contract_id?: string; status?: string }): ExtensionApplication[] {
  let sql = 'SELECT * FROM extension_applications WHERE 1=1'
  const params: unknown[] = []
  if (filters?.contract_id) {
    sql += ' AND contract_id = ?'
    params.push(filters.contract_id)
  }
  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  sql += ' ORDER BY created_at DESC'
  return db.prepare(sql).all(...params) as ExtensionApplication[]
}

export function getExtensionById(id: string): ExtensionApplication | undefined {
  return db.prepare('SELECT * FROM extension_applications WHERE id = ?').get(id) as ExtensionApplication | undefined
}

export function getExtensionCountByContractId(contractId: string): number {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM extension_applications WHERE contract_id = ?').get(contractId) as { cnt: number }
  return row.cnt
}

export function createExtension(data: Omit<ExtensionApplication, 'id' | 'created_at'>): ExtensionApplication {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO extension_applications (id, contract_id, extension_no, original_end_date, new_end_date, extension_reason, status, created_by, submitted_at)
    VALUES (@id, @contract_id, @extension_no, @original_end_date, @new_end_date, @extension_reason, @status, @created_by, @submitted_at)
  `).run({ id, ...data })
  return getExtensionById(id)!
}

export function updateExtension(id: string, data: Partial<Pick<ExtensionApplication, 'new_end_date' | 'extension_reason' | 'status' | 'submitted_at'>>): ExtensionApplication | undefined {
  const sets: string[] = []
  const params: Record<string, unknown> = { id }
  if (data.new_end_date !== undefined) { sets.push('new_end_date = @new_end_date'); params.new_end_date = data.new_end_date }
  if (data.extension_reason !== undefined) { sets.push('extension_reason = @extension_reason'); params.extension_reason = data.extension_reason }
  if (data.status !== undefined) { sets.push('status = @status'); params.status = data.status }
  if (data.submitted_at !== undefined) { sets.push('submitted_at = @submitted_at'); params.submitted_at = data.submitted_at }
  if (sets.length === 0) return getExtensionById(id)
  db.prepare(`UPDATE extension_applications SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getExtensionById(id)
}

export function deleteExtension(id: string): boolean {
  const result = db.prepare('DELETE FROM extension_applications WHERE id = ?').run(id)
  return result.changes > 0
}

export function getMaterialsByExtensionId(extensionId: string): Material[] {
  return db.prepare('SELECT * FROM materials WHERE extension_id = ? ORDER BY uploaded_at DESC').all(extensionId) as Material[]
}

export function createMaterial(data: Omit<Material, 'id' | 'uploaded_at'>): Material {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO materials (id, extension_id, name, type, category, source_person)
    VALUES (@id, @extension_id, @name, @type, @category, @source_person)
  `).run({ id, ...data })
  return db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as Material
}

export function deleteMaterial(id: string): boolean {
  const result = db.prepare('DELETE FROM materials WHERE id = ?').run(id)
  return result.changes > 0
}

export function getRiskFlagsByExtensionId(extensionId: string): RiskFlag[] {
  return db.prepare('SELECT * FROM risk_flags WHERE extension_id = ? ORDER BY detected_at DESC').all(extensionId) as RiskFlag[]
}

export function createRiskFlag(data: Omit<RiskFlag, 'id' | 'detected_at'>): RiskFlag {
  const id = crypto.randomUUID()
  db.prepare(`
    INSERT INTO risk_flags (id, extension_id, type, severity, description, related_entity_id)
    VALUES (@id, @extension_id, @type, @severity, @description, @related_entity_id)
  `).run({ id, ...data })
  return db.prepare('SELECT * FROM risk_flags WHERE id = ?').get(id) as RiskFlag
}

export function getAllRiskFlags(): RiskFlag[] {
  return db.prepare('SELECT * FROM risk_flags ORDER BY detected_at DESC').all() as RiskFlag[]
}
