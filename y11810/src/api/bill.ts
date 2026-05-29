import { request } from './client';
import type { PaginatedResponse } from '../../shared/types';

export interface Bill extends Record<string, unknown> {
  id: string;
  billNo: string;
  channelId: string;
  channelName: string;
  period: string;
  totalAmount: number;
  deductionAmount: number;
  finalAmount: number;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: string;
  paidAt?: string;
}

export async function getBills(params?: any): Promise<PaginatedResponse<Bill>> {
  return request<PaginatedResponse<Bill>>({
    method: 'GET',
    url: '/bills',
    params,
  });
}

export async function getBill(id: string): Promise<Bill> {
  return request<Bill>({
    method: 'GET',
    url: `/bills/${id}`,
  });
}
