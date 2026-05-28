import { get, put } from './api';
import type { PendingItem, ApiResponse } from 'shared/types';

export const pendingService = {
  getItems: (status?: 'pending' | 'confirmed' | 'ignored') =>
    get<PendingItem[]>('/pending/items', { status }),

  confirmItem: (id: string, operator: string, note?: string) =>
    put<PendingItem>(`/pending/${id}/confirm`, { operator, note }),

  ignoreItem: (id: string, operator: string, note?: string) =>
    put<PendingItem>(`/pending/${id}/ignore`, { operator, note }),

  batchConfirm: (ids: string[], operator: string, note?: string) =>
    put<{ confirmed: number }>('/pending/batch-confirm', { ids, operator, note }),

  batchIgnore: (ids: string[], operator: string, note?: string) =>
    put<{ ignored: number }>('/pending/batch-ignore', { ids, operator, note }),
};
