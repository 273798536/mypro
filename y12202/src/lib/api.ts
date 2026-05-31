import type {
  Contract,
  ContractDetail,
  ExtensionApplication,
  ExtensionDetail,
  Material,
  RiskFlag,
  DetectedRisk,
  AuditEntry,
  InfluenceChain,
  ConsistencyCheckItem,
  ApprovalRecord,
} from '@/types'

const API_BASE = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data: T; error?: string }> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
  return response.json()
}

export const contractApi = {
  list: (): Promise<{ success: boolean; data: Contract[]; error?: string }> =>
    fetchJson(`${API_BASE}/contracts`),

  getDetail: (id: string): Promise<{ success: boolean; data: ContractDetail; error?: string }> =>
    fetchJson(`${API_BASE}/contracts/${id}`),

  create: (data: Omit<Contract, 'id' | 'created_at'>): Promise<{ success: boolean; data: Contract; error?: string }> =>
    fetchJson(`${API_BASE}/contracts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const extensionApi = {
  list: (filters?: { contract_id?: string; status?: string }): Promise<{ success: boolean; data: ExtensionApplication[]; error?: string }> => {
    const params = new URLSearchParams()
    if (filters?.contract_id) params.set('contract_id', filters.contract_id)
    if (filters?.status) params.set('status', filters.status)
    const query = params.toString()
    return fetchJson(`${API_BASE}/extensions${query ? `?${query}` : ''}`)
  },

  getDetail: (id: string): Promise<{ success: boolean; data: ExtensionDetail; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}`),

  create: (data: { contract_id: string; original_end_date: string; new_end_date: string; extension_reason: string; created_by: string }): Promise<{ success: boolean; data: ExtensionApplication; error?: string }> =>
    fetchJson(`${API_BASE}/extensions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { new_end_date?: string; extension_reason?: string }): Promise<{ success: boolean; data: ExtensionApplication; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean; data: null; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}`, { method: 'DELETE' }),

  submit: (id: string): Promise<{ success: boolean; data: { extension: ExtensionApplication; risks: DetectedRisk[] }; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/submit`, { method: 'POST' }),

  approve: (id: string, data: { approver_name: string; approver_role: string; opinion?: string | null }): Promise<{ success: boolean; data: ExtensionApplication; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reject: (id: string, data: { approver_name: string; approver_role: string; opinion?: string | null }): Promise<{ success: boolean; data: ExtensionApplication; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMaterials: (id: string): Promise<{ success: boolean; data: Material[]; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/materials`),

  addMaterial: (id: string, data: { name: string; type: string; category: string; source_person: string }): Promise<{ success: boolean; data: Material; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/materials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeMaterial: (extensionId: string, materialId: string): Promise<{ success: boolean; data: null; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${extensionId}/materials/${materialId}`, { method: 'DELETE' }),

  getRisks: (id: string): Promise<{ success: boolean; data: RiskFlag[]; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/risks`),

  detectRisks: (id: string): Promise<{ success: boolean; data: DetectedRisk[]; error?: string }> =>
    fetchJson(`${API_BASE}/extensions/${id}/detect-risks`),
}

export const auditTrailApi = {
  getByExtension: (extensionId: string): Promise<{ success: boolean; data: AuditEntry[]; error?: string }> =>
    fetchJson(`${API_BASE}/audit-trail/extension/${extensionId}`),

  getAll: (): Promise<{ success: boolean; data: AuditEntry[]; error?: string }> =>
    fetchJson(`${API_BASE}/audit-trail/all`),

  getInfluenceChain: (approvalId: string): Promise<{ success: boolean; data: InfluenceChain; error?: string }> =>
    fetchJson(`${API_BASE}/audit-trail/influence-chain/${approvalId}`),

  getConsistencyCheck: (): Promise<{ success: boolean; data: ConsistencyCheckItem[]; error?: string }> =>
    fetchJson(`${API_BASE}/audit-trail/consistency-check`),

  linkInfluence: (data: { approval_id: string; influenced_by_approval_id: string }): Promise<{ success: boolean; data: ApprovalRecord; error?: string }> =>
    fetchJson(`${API_BASE}/audit-trail/link`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const riskDetectionApi = {
  getForExtension: (extensionId: string): Promise<{ success: boolean; data: DetectedRisk[]; error?: string }> =>
    fetchJson(`${API_BASE}/risk-detection/extension/${extensionId}`),

  getAllFlags: (): Promise<{ success: boolean; data: RiskFlag[]; error?: string }> =>
    fetchJson(`${API_BASE}/risk-detection/all`),
}

export const exportApi = {
  approvalList: (): Promise<Blob> =>
    fetch(`${API_BASE}/export/approval-list`).then(r => r.blob()),

  reviewReport: (): Promise<Blob> =>
    fetch(`${API_BASE}/export/review-report`).then(r => r.blob()),

  consistencyCheck: (): Promise<Blob> =>
    fetch(`${API_BASE}/export/consistency-check`).then(r => r.blob()),

  riskFlags: (): Promise<Blob> =>
    fetch(`${API_BASE}/export/risk-flags`).then(r => r.blob()),
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
