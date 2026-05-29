import type { Settlement, SettlementDetail, TrailItem, CommissionRule, AuditLog } from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json.data;
}

function buildQuery(params?: Record<string, string>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

export function fetchSettlements(filters?: Record<string, string>): Promise<Settlement[]> {
  return request<Settlement[]>(`/settlements${buildQuery(filters)}`);
}

export function fetchSettlementDetail(id: string): Promise<SettlementDetail> {
  return request<SettlementDetail>(`/settlements/${id}`);
}

export function confirmSettlement(id: string, operator?: string): Promise<void> {
  return request<void>(`/settlements/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ operator: operator || 'system' }),
  });
}

export function cancelSettlement(id: string, reason: string, operator?: string): Promise<void> {
  return request<void>(`/settlements/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, operator: operator || 'system' }),
  });
}

export function fetchSettlementTrail(id: string): Promise<TrailItem[]> {
  return request<TrailItem[]>(`/settlements/${id}/trail`);
}

export function addDeduction(
  id: string,
  data: { type: string; amount: number; description: string; sourceRef: string },
  operator?: string,
): Promise<void> {
  return request<void>(`/settlements/${id}/deductions`, {
    method: 'POST',
    body: JSON.stringify({ ...data, operator: operator || 'system' }),
  });
}

export function amendSettlement(
  id: string,
  data: { field: string; newValue: string; reason: string },
  operator?: string,
): Promise<void> {
  return request<void>(`/settlements/${id}/amend`, {
    method: 'POST',
    body: JSON.stringify({ ...data, operator: operator || 'system' }),
  });
}

export function fetchCommissionRules(): Promise<CommissionRule[]> {
  return request<CommissionRule[]>('/commission-rules');
}

export function calculateCommission(salePrice: number): Promise<{ rate: number; amount: number; fixedFee: number }> {
  return request('/commission-rules/calculate', {
    method: 'POST',
    body: JSON.stringify({ salePrice }),
  });
}

export function fetchConsignments(): Promise<any[]> {
  return request<any[]>('/consignments');
}

export function fetchAuditLogs(filters?: Record<string, string>): Promise<AuditLog[]> {
  return request<AuditLog[]>(`/audit-logs${buildQuery(filters)}`);
}

export function exportCsv(filters?: Record<string, string>): void {
  window.open(`${BASE}/settlements/export/csv${buildQuery(filters)}`);
}
