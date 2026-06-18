import {
  conflictRecords as mockConflicts,
} from '../mock/data';
import type {
  ConflictRecord,
  ConflictListParams,
  ConflictStatus,
  FilterPreset,
  PaginatedResult,
} from '../types';

const allConflicts = (): ConflictRecord[] => [...mockConflicts];

const severityRank: Record<ConflictRecord['severity'], number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

const matchSeverity = (
  s: ConflictRecord['severity'],
  filter?: ConflictRecord['severity'][]
): boolean => !filter || filter.length === 0 || filter.includes(s);

const matchStatus = (
  s: ConflictRecord['status'],
  filter?: ConflictStatus[]
): boolean => !filter || filter.length === 0 || filter.includes(s);

const matchIdemType = (
  t: ConflictRecord['idempotentKeyType'],
  filter?: ConflictRecord['idempotentKeyType'][]
): boolean => !filter || filter.length === 0 || filter.includes(t);

const matchKeyword = (c: ConflictRecord, keyword?: string): boolean => {
  if (!keyword) return true;
  const k = keyword.toLowerCase();
  return (
    c.orderNo.toLowerCase().includes(k) ||
    c.idempotentKey.toLowerCase().includes(k) ||
    c.migrationTaskName.toLowerCase().includes(k) ||
    c.id.toLowerCase().includes(k) ||
    c.tags.some((tag) => tag.toLowerCase().includes(k))
  );
};

const inDateRange = (iso: string, from?: string, to?: string): boolean => {
  const t = Date.parse(iso);
  if (from && t < Date.parse(from)) return false;
  if (to && t > Date.parse(to)) return false;
  return true;
};

export const ConflictService = {
  list(params: ConflictListParams = {}): PaginatedResult<ConflictRecord> {
    const {
      page = 1,
      pageSize = 20,
      severity,
      status,
      idempotentKeyType,
      keyword,
      assignee,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    let items = allConflicts().filter((c) =>
      matchSeverity(c.severity, severity) &&
      matchStatus(c.status, status) &&
      matchIdemType(c.idempotentKeyType, idempotentKeyType) &&
      matchKeyword(c, keyword) &&
      (!assignee || c.assignee === assignee) &&
      inDateRange(c.createdAt, dateFrom, dateTo)
    );

    items.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'severity') diff = severityRank[a.severity] - severityRank[b.severity];
      else if (sortBy === 'duplicateAttempts') diff = a.duplicateAttempts - b.duplicateAttempts;
      else if (sortBy === 'lastExecuteTime') diff = Date.parse(a.lastExecuteTime) - Date.parse(b.lastExecuteTime);
      else diff = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      return sortOrder === 'asc' ? diff : -diff;
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    items = items.slice(start, end);

    return { items, total, page, pageSize };
  },

  get(id: string): ConflictRecord | undefined {
    return allConflicts().find((c) => c.id === id);
  },

  filterPresets(): FilterPreset[] {
    return [
      {
        id: 'preset_critical_pending',
        name: '高危待处理',
        description: '严重度为 critical 且未处理的冲突',
        params: { severity: ['critical'], status: ['pending', 'in_progress'], sortBy: 'lastExecuteTime' },
      },
      {
        id: 'preset_unavailable_month',
        name: '本月不可用记录',
        description: '标记为 unavailable 的冲突，月底转交重点',
        params: { status: ['unavailable'], sortBy: 'createdAt' },
      },
      {
        id: 'preset_my_assign',
        name: '分配给我的',
        description: 'assignee 为当前登录用户（mock默认 u_002）',
        params: { assignee: 'u_002', status: ['pending', 'in_progress'], sortBy: 'severity' },
      },
      {
        id: 'preset_duplicate_retry',
        name: '高频重试冲突',
        description: '重复尝试次数 >= 5 的幂等拦截',
        params: { sortBy: 'duplicateAttempts', sortOrder: 'desc' },
      },
      {
        id: 'preset_schema_mismatch',
        name: '表结构不兼容',
        description: 'conflictType 为 schema_mismatch 的差异',
        params: { keyword: 'schema_mismatch', sortBy: 'severity' },
      },
    ];
  },

  markRead(ids: string[]): { updated: number } {
    mockConflicts.forEach((c) => {
      if (ids.includes(c.id)) {
        c.updatedAt = new Date().toISOString();
      }
    });
    return { updated: ids.length };
  },

  assign(ids: string[], userId: string): { updated: number; assignedTo: string } {
    mockConflicts.forEach((c) => {
      if (ids.includes(c.id)) {
        c.assignee = userId;
        c.currentOwner = userId;
        if (c.status === 'pending') c.status = 'in_progress';
        c.updatedAt = new Date().toISOString();
      }
    });
    return { updated: ids.length, assignedTo: userId };
  },

  updateStatus(id: string, status: ConflictStatus): ConflictRecord | undefined {
    const target = mockConflicts.find((c) => c.id === id);
    if (!target) return undefined;
    target.status = status;
    target.updatedAt = new Date().toISOString();
    return { ...target };
  },
};
