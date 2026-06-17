import { create } from 'zustand';
import type { Ticket, TicketVersion, AuditLog, DiffResult, DashboardStats, TicketStatus } from '../../shared/types.js';
import { ticketApi, versionApi, dashboardApi } from '../api/client.js';

interface TicketState {
  tickets: Ticket[];
  total: number;
  currentTicket: Ticket | null;
  currentVersion: TicketVersion | null;
  versions: TicketVersion[];
  auditLogs: AuditLog[];
  diffResult: DiffResult | null;
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  fetchTickets: (params?: {
    status?: TicketStatus;
    hasSampleLeak?: boolean;
    hasManualMark?: boolean;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;

  fetchTicketDetail: (id: string) => Promise<void>;
  fetchVersions: (ticketId: string) => Promise<void>;
  fetchVersionDetail: (ticketId: string, version: number) => Promise<void>;
  createVersion: (ticketId: string, data: Parameters<typeof versionApi.create>[1]) => Promise<boolean>;
  compareVersions: (ticketId: string, v1: number, v2: number) => Promise<void>;
  lockVersion: (ticketId: string, version: number, operator: string) => Promise<boolean>;
  unlockVersion: (ticketId: string) => Promise<boolean>;
  updateStatus: (id: string, status: TicketStatus, operator: string) => Promise<boolean>;
  fetchAuditLogs: (ticketId: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  exportTicket: (id: string, format?: 'excel' | 'pdf') => Promise<void>;
  clearDiff: () => void;
  setError: (error: string | null) => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  total: 0,
  currentTicket: null,
  currentVersion: null,
  versions: [],
  auditLogs: [],
  diffResult: null,
  stats: null,
  loading: false,
  error: null,

  fetchTickets: async (params) => {
    set({ loading: true, error: null });
    try {
      const res = await ticketApi.getList(params);
      if (res.success && res.data) {
        set({ tickets: res.data.data, total: res.data.total });
      } else {
        set({ error: res.error || '获取工单列表失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  fetchTicketDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await ticketApi.getDetail(id);
      if (res.success && res.data) {
        set({ currentTicket: res.data.ticket, currentVersion: res.data.activeVersion });
      } else {
        set({ error: res.error || '获取工单详情失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  fetchVersions: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.getList(ticketId);
      if (res.success && res.data) {
        set({ versions: res.data });
      } else {
        set({ error: res.error || '获取版本列表失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  fetchVersionDetail: async (ticketId, version) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.getDetail(ticketId, version);
      if (res.success && res.data) {
        set({ currentVersion: res.data });
      } else {
        set({ error: res.error || '获取版本详情失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  createVersion: async (ticketId, data) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.create(ticketId, data);
      if (res.success) {
        return true;
      }
      set({ error: res.error || '创建版本失败' });
      return false;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  compareVersions: async (ticketId, v1, v2) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.compare(ticketId, v1, v2);
      if (res.success && res.data) {
        set({ diffResult: res.data });
      } else {
        set({ error: res.error || '版本对比失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  lockVersion: async (ticketId, version, operator) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.lock(ticketId, version, operator);
      if (res.success) {
        return true;
      }
      set({ error: res.error || '锁定失败' });
      return false;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  unlockVersion: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      const res = await versionApi.unlock(ticketId);
      if (res.success) {
        return true;
      }
      set({ error: res.error || '解锁失败' });
      return false;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateStatus: async (id, status, operator) => {
    set({ loading: true, error: null });
    try {
      const res = await ticketApi.updateStatus(id, status, operator);
      if (res.success) {
        return true;
      }
      set({ error: res.error || '状态更新失败' });
      return false;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  fetchAuditLogs: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      const res = await ticketApi.getAuditLogs(ticketId);
      if (res.success && res.data) {
        set({ auditLogs: res.data });
      } else {
        set({ error: res.error || '获取操作日志失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await dashboardApi.getStats();
      if (res.success && res.data) {
        set({ stats: res.data });
      } else {
        set({ error: res.error || '获取统计数据失败' });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '网络错误' });
    } finally {
      set({ loading: false });
    }
  },

  exportTicket: async (id, format = 'excel') => {
    set({ loading: true, error: null });
    try {
      const res = await ticketApi.export(id, format);
      const blob = new Blob([res.data], {
        type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${id}-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '导出失败' });
    } finally {
      set({ loading: false });
    }
  },

  clearDiff: () => set({ diffResult: null }),
  setError: (error) => set({ error }),
}));
