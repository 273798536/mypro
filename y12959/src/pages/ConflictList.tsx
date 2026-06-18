import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  ArrowUpDown,
  Check,
  Eye,
  Wrench,
  CheckSquare,
  UserRound,
  Download,
  X,
  ListFilter,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ConflictService } from '@/services/ConflictService';
import { ExportService } from '@/services/ExportService';
import {
  formatDateTime,
  formatRelative,
  getSeverityMeta,
  getStatusMeta,
} from '@/utils/format';
import {
  users,
} from '@/mock/data';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';
import Chip from '@/components/Chip';
import type {
  ConflictListParams,
  ConflictRecord,
  ConflictSeverity,
  ConflictStatus,
  FilterPreset,
  PaginatedResult,
} from '@/types';
import { cn } from '@/lib/utils';

const conflictTypeLabels: Record<ConflictRecord['conflictType'], string> = {
  duplicate_execution: '重复执行',
  schema_mismatch: '表结构不兼容',
  key_collision: '键值冲突',
};

const idemTypeLabels: Record<ConflictRecord['idempotentKeyType'], string> = {
  order_no: '订单号',
  biz_id: '业务ID',
  unique_hash: '内容哈希',
  composite: '联合键',
};

const sortOptions: Array<{
  value: NonNullable<ConflictListParams['sortBy']>;
  label: string;
}> = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'severity', label: '严重度' },
  { value: 'lastExecuteTime', label: '最近执行时间' },
  { value: 'duplicateAttempts', label: '重复次数' },
];

interface ConflictFiltersProps {
  params: ConflictListParams;
  onChange: (params: ConflictListParams) => void;
  onReset: () => void;
  presets: FilterPreset[];
  activePresetId: string | null;
  onPresetSelect: (preset: FilterPreset) => void;
}

function ConflictFilters({
  params,
  onChange,
  onReset,
  presets,
  activePresetId,
  onPresetSelect,
}: ConflictFiltersProps) {
  const [expanded, setExpanded] = useState(true);
  const [presetOpen, setPresetOpen] = useState(false);

  const severityOptions: ConflictSeverity[] = ['critical', 'warning', 'info'];
  const statusOptions: ConflictStatus[] = [
    'pending',
    'in_progress',
    'resolved',
    'ignored',
    'unavailable',
  ];
  const idemTypeOptions: ConflictRecord['idempotentKeyType'][] = [
    'order_no',
    'biz_id',
    'unique_hash',
    'composite',
  ];

  const toggleSeverity = (s: ConflictSeverity) => {
    const current = params.severity ?? [];
    const next = current.includes(s)
      ? current.filter((v) => v !== s)
      : [...current, s];
    onChange({ ...params, severity: next.length ? next : undefined, page: 1 });
  };

  const toggleStatus = (s: ConflictStatus) => {
    const current = params.status ?? [];
    const next = current.includes(s)
      ? current.filter((v) => v !== s)
      : [...current, s];
    onChange({ ...params, status: next.length ? next : undefined, page: 1 });
  };

  const toggleIdemType = (t: ConflictRecord['idempotentKeyType']) => {
    const current = params.idempotentKeyType ?? [];
    const next = current.includes(t)
      ? current.filter((v) => v !== t)
      : [...current, t];
    onChange({
      ...params,
      idempotentKeyType: next.length ? next : undefined,
      page: 1,
    });
  };

  const activeChipCount =
    (params.severity?.length ?? 0) +
    (params.status?.length ?? 0) +
    (params.idempotentKeyType?.length ?? 0) +
    (params.keyword ? 1 : 0) +
    (params.assignee ? 1 : 0) +
    ((params.dateFrom || params.dateTo) ? 1 : 0) +
    (params.sortBy && params.sortBy !== 'createdAt' ? 1 : 0);

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-audit-100">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPresetOpen((v) => !v)}
              className={cn(
                'btn-secondary relative z-10',
                activePresetId && 'border-audit-500 bg-audit-50'
              )}
            >
              <ListFilter className="h-4 w-4" />
              筛选预设
              <ChevronDown className={cn('h-4 w-4 transition-transform', presetOpen && 'rotate-180')} />
            </button>
            {presetOpen && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setPresetOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-20 w-80 rounded-lg border border-audit-200 bg-white shadow-lg overflow-hidden">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onPresetSelect(preset);
                        setPresetOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left border-b border-audit-100 last:border-0 transition-colors',
                        'hover:bg-audit-50',
                        activePresetId === preset.id && 'bg-audit-50/80'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-audit-800">
                          {preset.name}
                        </span>
                        {activePresetId === preset.id && (
                          <Check className="h-4 w-4 text-audit-600" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-audit-500 leading-relaxed">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-audit-400" />
            <input
              type="text"
              placeholder="搜索订单号 / 幂等键 / 迁移任务名..."
              value={params.keyword ?? ''}
              onChange={(e) =>
                onChange({ ...params, keyword: e.target.value || undefined, page: 1 })
              }
              className="input pl-9 w-80"
            />
          </div>

          {activeChipCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-audit-500 hover:text-audit-700 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              清除 {activeChipCount} 个筛选
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-audit-400">
            {activeChipCount > 0 ? `${activeChipCount} 个筛选条件` : '默认筛选'}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="btn-ghost py-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {expanded ? '收起' : '展开'}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                严重度
              </label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map((s) => {
                  const meta = getSeverityMeta(s);
                  const active = (params.severity ?? []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeverity(s)}
                      className={cn(
                        'chip cursor-pointer transition-all',
                        active
                          ? `${meta.bgClass} ${meta.textClass} border-current ring-2 ring-offset-1 ring-audit-300/50`
                          : 'bg-white text-audit-600 border-audit-200 hover:bg-audit-50'
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                状态
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => {
                  const meta = getStatusMeta(s);
                  const active = (params.status ?? []).includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        'chip cursor-pointer transition-all',
                        active
                          ? `${meta.bgClass} ${meta.textClass} border-current ring-2 ring-offset-1 ring-audit-300/50`
                          : 'bg-white text-audit-600 border-audit-200 hover:bg-audit-50'
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                幂等键类型
              </label>
              <div className="flex flex-wrap gap-2">
                {idemTypeOptions.map((t) => {
                  const active = (params.idempotentKeyType ?? []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleIdemType(t)}
                      className={cn(
                        'chip cursor-pointer transition-all',
                        active
                          ? 'bg-audit-500 text-white border-audit-500'
                          : 'bg-white text-audit-600 border-audit-200 hover:bg-audit-50'
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {idemTypeLabels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                创建日期范围
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={params.dateFrom?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...params,
                      dateFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                      page: 1,
                    })
                  }
                  className="input text-xs"
                />
                <span className="text-audit-400">至</span>
                <input
                  type="date"
                  value={params.dateTo?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...params,
                      dateTo: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
                      page: 1,
                    })
                  }
                  className="input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                操作人（负责人）
              </label>
              <select
                value={params.assignee ?? ''}
                onChange={(e) =>
                  onChange({
                    ...params,
                    assignee: e.target.value || undefined,
                    page: 1,
                  })
                }
                className="select"
              >
                <option value="">全部</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                排序
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={params.sortBy ?? 'createdAt'}
                  onChange={(e) =>
                    onChange({
                      ...params,
                      sortBy: e.target.value as ConflictListParams['sortBy'],
                      page: 1,
                    })
                  }
                  className="select flex-1"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...params,
                      sortOrder: params.sortOrder === 'asc' ? 'desc' : 'asc',
                      page: 1,
                    })
                  }
                  className="btn-secondary px-3"
                  title={params.sortOrder === 'asc' ? '升序' : '降序'}
                >
                  {params.sortOrder === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-audit-100 pt-3">
            <span className="text-xs text-audit-400 mr-2 self-center">已选条件：</span>
            {params.keyword && (
              <Chip variant="outline" size="sm" onRemove={() => onChange({ ...params, keyword: undefined, page: 1 })}>
                关键词: {params.keyword}
              </Chip>
            )}
            {params.severity?.map((s) => (
              <Chip
                key={s}
                variant="danger"
                size="sm"
                onRemove={() => toggleSeverity(s)}
              >
                严重度: {getSeverityMeta(s).label}
              </Chip>
            ))}
            {params.status?.map((s) => (
              <Chip
                key={s}
                variant="info"
                size="sm"
                onRemove={() => toggleStatus(s)}
              >
                状态: {getStatusMeta(s).label}
              </Chip>
            ))}
            {params.idempotentKeyType?.map((t) => (
              <Chip
                key={t}
                variant="primary"
                size="sm"
                onRemove={() => toggleIdemType(t)}
              >
                键类型: {idemTypeLabels[t]}
              </Chip>
            ))}
            {params.assignee && (
              <Chip
                variant="success"
                size="sm"
                onRemove={() => onChange({ ...params, assignee: undefined, page: 1 })}
              >
                负责人: {users.find((u) => u.id === params.assignee)?.displayName ?? params.assignee}
              </Chip>
            )}
            {(params.dateFrom || params.dateTo) && (
              <Chip
                variant="warning"
                size="sm"
                onRemove={() => onChange({ ...params, dateFrom: undefined, dateTo: undefined, page: 1 })}
              >
                日期: {params.dateFrom?.slice(0, 10) ?? '∞'} ~ {params.dateTo?.slice(0, 10) ?? '∞'}
              </Chip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConflictList() {
  const navigate = useNavigate();
  const {
    selectedConflictIds,
    toggleConflictId,
    clearSelectedIds,
    setExplanationContext,
    currentUser,
  } = useAppStore();

  const [params, setParams] = useState<ConflictListParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [data, setData] = useState<PaginatedResult<ConflictRecord> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState('');

  const presets = useMemo(() => ConflictService.filterPresets(), []);

  const fetchData = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const result = ConflictService.list(params);
      setData(result);
      setLoading(false);
    }, 200);
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      clearSelectedIds();
      setExplanationContext(null, null);
    };
  }, [clearSelectedIds, setExplanationContext]);

  const allSelectedOnPage = useMemo(() => {
    if (!data?.items.length) return false;
    return data.items.every((item) => selectedConflictIds.includes(item.id));
  }, [data, selectedConflictIds]);

  const someSelectedOnPage = useMemo(() => {
    if (!data?.items.length) return false;
    return data.items.some((item) => selectedConflictIds.includes(item.id));
  }, [data, selectedConflictIds]);

  const handleToggleAll = () => {
    if (!data?.items.length) return;
    if (allSelectedOnPage) {
      data.items.forEach((item) => {
        if (selectedConflictIds.includes(item.id)) {
          toggleConflictId(item.id);
        }
      });
    } else {
      data.items.forEach((item) => {
        if (!selectedConflictIds.includes(item.id)) {
          toggleConflictId(item.id);
        }
      });
    }
  };

  const handlePresetSelect = (preset: FilterPreset) => {
    setActivePresetId(preset.id);
    setParams({
      ...preset.params,
      page: 1,
      pageSize: params.pageSize,
    });
  };

  const handleReset = () => {
    setActivePresetId(null);
    setParams({
      page: 1,
      pageSize: params.pageSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleMarkRead = () => {
    if (!selectedConflictIds.length) return;
    ConflictService.markRead(selectedConflictIds);
    clearSelectedIds();
    fetchData();
  };

  const handleAssignConfirm = () => {
    if (!selectedConflictIds.length || !assignTargetId) return;
    ConflictService.assign(selectedConflictIds, assignTargetId);
    clearSelectedIds();
    setAssignOpen(false);
    setAssignTargetId('');
    fetchData();
  };

  const handleExport = () => {
    if (!selectedConflictIds.length) return;
    ExportService.createJob({
      format: 'xlsx',
      scope: 'current_filter',
      filterCriteria: params as Record<string, unknown>,
      createdBy: currentUser.id,
    });
  };

  const handleRowHover = (item: ConflictRecord | null) => {
    if (!item) {
      setExplanationContext(null, null);
      return;
    }
    setExplanationContext('idempotent_key', {
      idempotent_key: {
        key: item.idempotentKey,
        keyType: item.idempotentKeyType,
        attempts: item.duplicateAttempts,
        firstTime: item.firstExecuteTime,
        lastTime: item.lastExecuteTime,
      },
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const getAssigneeName = (id?: string) => {
    if (!id) return <span className="text-audit-400">未分配</span>;
    const u = users.find((x) => x.id === id);
    return u?.displayName ?? id;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="page-title">冲突记录列表</h1>
          <p className="mt-1 text-sm text-audit-500">
            数据迁移过程中被幂等系统拦截的异常记录，按严重度与优先级处理
          </p>
        </div>
        <div className="text-xs text-audit-500">
          {data && (
            <span>
              共 <span className="font-semibold text-audit-800">{data.total}</span> 条记录
              {selectedConflictIds.length > 0 && (
                <span className="ml-2">
                  已选 <span className="font-semibold text-audit-700">{selectedConflictIds.length}</span> 条
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <ConflictFilters
        params={params}
        onChange={setParams}
        onReset={handleReset}
        presets={presets}
        activePresetId={activePresetId}
        onPresetSelect={handlePresetSelect}
      />

      {selectedConflictIds.length > 0 && (
        <div className="card mb-4 px-4 py-3 flex items-center justify-between border-audit-300 bg-audit-50/50">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-4 w-4 text-audit-600" />
            <span className="text-sm text-audit-700">
              已选择 <span className="font-semibold">{selectedConflictIds.length}</span> 条记录
            </span>
            <button
              type="button"
              onClick={clearSelectedIds}
              className="text-xs text-audit-500 hover:text-audit-700 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              取消选择
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleMarkRead} className="btn-secondary">
              <Check className="h-4 w-4" />
              批量标记已读
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAssignOpen((v) => !v)}
                className="btn-secondary"
              >
                <UserRound className="h-4 w-4" />
                批量分配
              </button>
              {assignOpen && (
                <>
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setAssignOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-72 rounded-lg border border-audit-200 bg-white shadow-lg p-3">
                    <label className="label">选择负责人</label>
                    <select
                      value={assignTargetId}
                      onChange={(e) => setAssignTargetId(e.target.value)}
                      className="select mb-3"
                    >
                      <option value="">请选择...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignOpen(false)}
                        className="btn-ghost py-1.5"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleAssignConfirm}
                        disabled={!assignTargetId}
                        className="btn-primary py-1.5 disabled:opacity-50"
                      >
                        确认分配
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button type="button" onClick={handleExport} className="btn-secondary">
              <Download className="h-4 w-4" />
              批量导出
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 card overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto scrollbar-thin">
            {loading && !data ? (
              <div className="flex items-center justify-center h-64 text-audit-400">
                <div className="animate-pulse">加载中...</div>
              </div>
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                variant="search"
                title="未找到匹配的冲突记录"
                description="尝试调整筛选条件、清除预设或检查日期范围"
              />
            ) : (
              <table className="data-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelectedOnPage}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelectedOnPage && !allSelectedOnPage;
                        }}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                      />
                    </th>
                    <th>记录ID / 迁移任务</th>
                    <th>订单号 / 幂等键</th>
                    <th>冲突类型</th>
                    <th>严重度</th>
                    <th>执行时间</th>
                    <th className="text-center">重复次数</th>
                    <th>状态</th>
                    <th>负责人</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'cursor-default transition-colors',
                        selectedConflictIds.includes(item.id) && 'bg-audit-100/50'
                      )}
                      onMouseEnter={() => handleRowHover(item)}
                      onMouseLeave={() => handleRowHover(null)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedConflictIds.includes(item.id)}
                          onChange={() => toggleConflictId(item.id)}
                          className="h-4 w-4 rounded border-audit-300 text-audit-600 focus:ring-audit-500"
                        />
                      </td>
                      <td>
                        <div className="font-mono text-xs text-audit-500">{item.id}</div>
                        <div className="mt-0.5 text-sm font-medium text-audit-800 truncate max-w-[220px]" title={item.migrationTaskName}>
                          {item.migrationTaskName}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-audit-800 font-mono">
                          {item.orderNo}
                        </div>
                        <div className="mt-0.5 text-xs text-audit-500 font-mono truncate max-w-[200px]" title={item.idempotentKey}>
                          {idemTypeLabels[item.idempotentKeyType]}: {item.idempotentKey}
                        </div>
                      </td>
                      <td>
                        <Chip variant="outline" size="sm">
                          {conflictTypeLabels[item.conflictType]}
                        </Chip>
                      </td>
                      <td>
                        <SeverityBadge severity={item.severity} />
                      </td>
                      <td>
                        <div className="text-xs text-audit-500">
                          首次: <span className="text-audit-700">{formatDateTime(item.firstExecuteTime)}</span>
                        </div>
                        <div className="mt-1 text-xs text-audit-500">
                          最近: <span className="text-audit-700">{formatRelative(item.lastExecuteTime)}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold',
                            item.duplicateAttempts >= 5
                              ? 'bg-danger-100 text-danger-700 border border-danger-200'
                              : item.duplicateAttempts >= 3
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-audit-100 text-audit-700 border border-audit-200'
                          )}
                          title={`已重复尝试 ${item.duplicateAttempts} 次`}
                        >
                          {item.duplicateAttempts}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div className="text-sm">{getAssigneeName(item.assignee)}</div>
                        <div className="mt-0.5 text-[11px] text-audit-400">
                          当前: {users.find((u) => u.id === item.currentOwner)?.displayName ?? item.currentOwner}
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/conflict/${item.id}`)}
                          className="btn-ghost py-1.5 px-2 text-xs"
                          title="查看详情"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          详情
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/conflict/${item.id}/resolve`)}
                          className="btn-ghost py-1.5 px-2 text-xs text-audit-600 hover:text-audit-800"
                          title="进入修正流程"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          修正
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data && data.total > 0 && (
            <Pagination
              currentPage={params.page ?? 1}
              totalPages={totalPages}
              pageSize={params.pageSize ?? 10}
              totalItems={data.total}
              onPageChange={(page) => setParams({ ...params, page })}
              onPageSizeChange={(size) => setParams({ ...params, pageSize: size, page: 1 })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
