import db from '../db.js'

function escapeCsvField(field: unknown): string {
  const str = field === null || field === undefined ? '' : String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    headers.map(h => escapeCsvField(row[h])).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

export function exportApprovalListCsv(): string {
  const rows = db.prepare(`
    SELECT 
      ea.id as extension_id,
      ea.extension_no,
      c.contract_no,
      c.borrower_name,
      ea.original_end_date,
      ea.new_end_date,
      ea.extension_reason,
      ea.status,
      ea.created_at,
      ea.submitted_at
    FROM extension_applications ea
    JOIN contracts c ON ea.contract_id = c.id
    ORDER BY ea.created_at DESC
  `).all() as Record<string, unknown>[]

  const headers = ['extension_id', 'extension_no', 'contract_no', 'borrower_name', 'original_end_date', 'new_end_date', 'extension_reason', 'status', 'created_at', 'submitted_at']
  return rowsToCsv(headers, rows)
}

export function exportReviewReportCsv(): string {
  const rows = db.prepare(`
    SELECT 
      ea.id as extension_id,
      c.contract_no,
      c.borrower_name,
      ea.extension_no,
      ea.status as extension_status,
      ar.approver_name,
      ar.approver_role,
      ar.action as approval_action,
      ar.opinion,
      ar.created_at as approval_time
    FROM extension_applications ea
    JOIN contracts c ON ea.contract_id = c.id
    LEFT JOIN approval_records ar ON ea.id = ar.extension_id
    ORDER BY ea.created_at DESC, ar.created_at ASC
  `).all() as Record<string, unknown>[]

  const headers = ['extension_id', 'contract_no', 'borrower_name', 'extension_no', 'extension_status', 'approver_name', 'approver_role', 'approval_action', 'opinion', 'approval_time']
  return rowsToCsv(headers, rows)
}

export function exportConsistencyCheckCsv(): string {
  const extensions = db.prepare('SELECT id, status FROM extension_applications').all() as { id: string; status: string }[]

  const rows = extensions.map(ext => {
    const latestApproval = db.prepare(`
      SELECT action FROM approval_records WHERE extension_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(ext.id) as { action: string } | undefined

    return {
      extension_id: ext.id,
      extension_status: ext.status,
      latest_approval_action: latestApproval?.action ?? '无审批记录',
      mismatch: latestApproval && latestApproval.action !== ext.status ? '是' : '否',
    }
  })

  const headers = ['extension_id', 'extension_status', 'latest_approval_action', 'mismatch']
  return rowsToCsv(headers, rows)
}

export function exportRiskFlagsCsv(): string {
  const rows = db.prepare(`
    SELECT 
      rf.id,
      rf.type,
      rf.severity,
      rf.description,
      rf.related_entity_id,
      rf.detected_at,
      ea.extension_no,
      c.contract_no,
      c.borrower_name
    FROM risk_flags rf
    JOIN extension_applications ea ON rf.extension_id = ea.id
    JOIN contracts c ON ea.contract_id = c.id
    ORDER BY rf.detected_at DESC
  `).all() as Record<string, unknown>[]

  const headers = ['id', 'type', 'severity', 'description', 'related_entity_id', 'detected_at', 'extension_no', 'contract_no', 'borrower_name']
  return rowsToCsv(headers, rows)
}
