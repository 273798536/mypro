import { get } from './api';
import type { AuditHistory, ApiResponse, PaginatedResponse, PaginationParams } from '../../shared/types';

interface AuditFilters {
  recordId?: string;
  recordType?: string;
  changedBy?: string;
  startDate?: string;
  endDate?: string;
}

export const getAuditHistory = async (
  filters?: AuditFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<PaginatedResponse<AuditHistory>>> => {
  return get('/audit/history', { ...filters, ...pagination });
};

export const getAuditByRecordId = async (
  recordId: string,
  recordType?: string
): Promise<ApiResponse<AuditHistory[]>> => {
  return get<AuditHistory[]>('/audit/history', { recordId, recordType });
};
