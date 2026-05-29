import { request } from './client';
import type { SettlementRun, SettlementDetail, PaginatedResponse, DiffResult } from '../../shared/types';

export interface RunDetailResponse {
  run: SettlementRun;
  details: SettlementDetail[];
}

export async function getRuns(params?: any): Promise<PaginatedResponse<SettlementRun>> {
  return request<PaginatedResponse<SettlementRun>>({
    method: 'GET',
    url: '/settlement/runs',
    params,
  });
}

export async function createRun(data: {
  channelId: string;
  startDate: string;
  endDate: string;
  baseRunId?: string;
}): Promise<SettlementRun> {
  return request<SettlementRun>({
    method: 'POST',
    url: '/settlement/runs',
    data,
  });
}

export async function getRun(id: string): Promise<RunDetailResponse> {
  return request<RunDetailResponse>({
    method: 'GET',
    url: `/settlement/runs/${id}`,
  });
}

export async function runSettlement(id: string): Promise<SettlementRun> {
  return request<SettlementRun>({
    method: 'POST',
    url: `/settlement/runs/${id}/run`,
  });
}

export async function compareRuns(id: string, baseRunId: string): Promise<{ diffs: DiffResult[]; diffCount: number }> {
  return request<{ diffs: DiffResult[]; diffCount: number }>({
    method: 'POST',
    url: `/settlement/runs/${id}/compare`,
    data: { baseRunId },
  });
}

export async function confirmRun(id: string): Promise<SettlementRun> {
  return request<SettlementRun>({
    method: 'POST',
    url: `/settlement/runs/${id}/confirm`,
  });
}

export async function exportRun(id: string): Promise<Blob> {
  return request<Blob>({
    method: 'GET',
    url: `/settlement/runs/${id}/export`,
    responseType: 'blob',
  });
}
