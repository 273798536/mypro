import axios from 'axios';
import type { Ticket, TicketVersion, AuditLog, DiffResult, DashboardStats, TicketStatus } from '../../shared/types.js';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TicketListResponse {
  data: Ticket[];
  total: number;
}

export const ticketApi = {
  getList: (params?: {
    status?: TicketStatus;
    hasSampleLeak?: boolean;
    hasManualMark?: boolean;
    page?: number;
    pageSize?: number;
  }) => api.get<ApiResponse<TicketListResponse>>('/tickets', { params }).then(res => res.data),

  getDetail: (id: string) =>
    api.get<ApiResponse<{ ticket: Ticket; activeVersion: TicketVersion }>>(`/tickets/${id}`).then(res => res.data),

  updateStatus: (id: string, status: TicketStatus, operator: string) =>
    api.patch<ApiResponse<Ticket>>(`/tickets/${id}/status`, { status, operator }).then(res => res.data),

  getAuditLogs: (id: string) =>
    api.get<ApiResponse<AuditLog[]>>(`/tickets/${id}/audit-logs`).then(res => res.data),

  export: (id: string, format: 'excel' | 'pdf' = 'excel') =>
    api.get(`/tickets/${id}/export`, { params: { format }, responseType: 'blob' }),
};

export const versionApi = {
  getList: (ticketId: string) =>
    api.get<ApiResponse<TicketVersion[]>>(`/tickets/${ticketId}/versions`).then(res => res.data),

  getDetail: (ticketId: string, version: number) =>
    api.get<ApiResponse<TicketVersion>>(`/tickets/${ticketId}/versions/${version}`).then(res => res.data),

  create: (ticketId: string, data: {
    evidences: Array<{
      content: string;
      source: 'import' | 'supplement' | 'auto' | 'manual';
      isSampleLeak: boolean;
      importBatch: string;
    }>;
    changeNote: string;
    modelVersion?: string;
  }) => api.post<ApiResponse<TicketVersion>>(`/tickets/${ticketId}/versions`, data).then(res => res.data),

  compare: (ticketId: string, v1: number, v2: number) =>
    api.get<ApiResponse<DiffResult>>(`/tickets/${ticketId}/compare`, { params: { v1, v2 } }).then(res => res.data),

  lock: (ticketId: string, version: number, operator: string) =>
    api.post<ApiResponse<{ success: boolean; lockedVersion: number }>>(`/tickets/${ticketId}/lock`, { version, operator }).then(res => res.data),

  unlock: (ticketId: string) =>
    api.post<ApiResponse<{ success: boolean }>>(`/tickets/${ticketId}/unlock`).then(res => res.data),
};

export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/stats').then(res => res.data),
};

export default api;
