import type { CalculateRequest, CalculateResult, HistoryListItem, HistoryDetail } from '@shared/types';

const API_BASE = '/api';

export async function calculateRollComfort(request: CalculateRequest): Promise<CalculateResult> {
  const response = await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '计算请求失败');
  }

  return response.json();
}

export async function getHistoryList(limit?: number): Promise<HistoryListItem[]> {
  const url = limit ? `${API_BASE}/history?limit=${limit}` : `${API_BASE}/history`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('获取历史记录失败');
  }

  return response.json();
}

export async function getHistoryDetail(id: string): Promise<HistoryDetail> {
  const response = await fetch(`${API_BASE}/history/${id}`);

  if (!response.ok) {
    throw new Error('获取历史记录详情失败');
  }

  return response.json();
}

export async function deleteHistoryRecord(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除历史记录失败');
  }

  return response.json();
}
