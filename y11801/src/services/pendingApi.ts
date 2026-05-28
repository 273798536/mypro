import { get, put } from './api';
import type { PendingItem, PendingType, ApiResponse } from '../../shared/types';

interface PendingFilters {
  status?: PendingItem['status'];
  type?: PendingType;
  level?: PendingItem['level'];
}

export const getPendingItems = async (
  filters?: PendingFilters
): Promise<ApiResponse<PendingItem[]>> => {
  return get<PendingItem[]>('/pending/items', filters);
};

export const confirmPendingItem = async (
  id: string,
  operator: string,
  note?: string
): Promise<ApiResponse<PendingItem>> => {
  return put<PendingItem>(`/pending/${id}/confirm`, { operator, note });
};

export const batchConfirmPendingItems = async (
  ids: string[],
  operator: string,
  note?: string
): Promise<ApiResponse<{ confirmed: number }>> => {
  return put<{ confirmed: number }>('/pending/batch-confirm', { ids, operator, note });
};
