import axios from 'axios';
import type { Dispute, TimelineEvent, ImportResult } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export async function importEmails(files: File[], isLate = false): Promise<ImportResult> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  if (isLate) {
    formData.append('markLate', 'true');
  }
  const endpoint = isLate ? '/emails/import-late' : '/emails/import';
  const { data } = await api.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function getDisputes(): Promise<Dispute[]> {
  const { data } = await api.get('/disputes');
  return data;
}

export async function updateRemark(id: string, remark: string, operator?: string): Promise<Dispute> {
  const { data } = await api.put(`/disputes/${id}/remark`, { remark, operator });
  return data;
}

export async function updateStatus(id: string, status: string, operator?: string): Promise<Dispute> {
  const { data } = await api.put(`/disputes/${id}/status`, { status, operator });
  return data;
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  const { data } = await api.get('/timeline');
  return data;
}

export function exportExcel(): void {
  window.open('/api/export', '_blank');
}
