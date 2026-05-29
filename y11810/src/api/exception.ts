import { request } from './client';
import type { ExceptionRecord, PaginatedResponse } from '../../shared/types';

export async function getExceptions(params?: any): Promise<PaginatedResponse<ExceptionRecord>> {
  return request<PaginatedResponse<ExceptionRecord>>({
    method: 'GET',
    url: '/exceptions',
    params,
  });
}

export async function handleException(
  id: string,
  data: { status: string; handleNote: string }
): Promise<ExceptionRecord> {
  return request<ExceptionRecord>({
    method: 'PATCH',
    url: `/exceptions/${id}/handle`,
    data,
  });
}
