import { useAppStore } from '@/store/useAppStore';
import type { ReviewStatus, AnomalyType } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import { Filter, X, ArrowUpDown, Search } from 'lucide-react';
import { useState } from 'react';

export function FilterBar() {
  const { viewState, updateViewState, records } = useAppStore();
  const { filters, sortBy, sortOrder } = viewState;
  const [searchTerm, setSearchTerm] = useState(filters.proteinName || '');

  const statusOptions: { value: ReviewStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'usable', label: '可直接使用' },
    { value: 'pending', label: '待复核' },
    { value: 'unusable', label: '不可用' },
  ];

  const anomalyOptions: { value: AnomalyType | 'none' | 'all'; label: string }[] = [
    { value: 'all', label: '全部异常' },
    { value: 'none', label: '无异常' },
    { value: 'camera_lost', label: '视角丢失' },
    { value: 'data_conflict', label: '数据冲突' },
    { value: 'format_error', label: '格式错误' },
  ];

  const sortOptions: { value: keyof typeof sortByKeys; label: string }[] = [
    { value: 'originalRowNumber', label: '原始行号' },
    { value: 'proteinName', label: '蛋白名称' },
    { value: 'affinity', label: '亲和力' },
    { value: 'sourceFile', label: '来源文件' },
    { value: 'updatedAt', label: '更新时间' },
  ];

  const sortByKeys = {
    originalRowNumber: true,
    proteinName: true,
    affinity: true,
    sourceFile: true,
    updatedAt: true,
  };

  const stats = {
    total: records.length,
    usable: records.filter((r) => r.reviewStatus === 'usable').length,
    pending: records.filter((r) => r.reviewStatus === 'pending').length,
    unusable: records.filter((r) => r.reviewStatus === 'unusable').length,
  };

  return (
    <div className="space-y-3 border-b border-pocket-border bg-pocket-card/50 px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-pocket-muted">
          <Filter size={14} />
          <span className="text-xs font-medium">筛选</span>
        </div>

        <div className="relative ml-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pocket-muted" />
          <input
            type="text"
            placeholder="搜索蛋白名称..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              updateViewState({
                filters: { ...filters, proteinName: e.target.value || undefined },
              });
            }}
            className="h-8 w-56 rounded-md border border-pocket-border bg-pocket-bg pl-8 pr-8 text-xs text-pocket-text placeholder:text-pocket-muted focus:border-pocket-accent/50 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                updateViewState({ filters: { ...filters, proteinName: undefined } });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-pocket-muted hover:text-pocket-text"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <select
          value={filters.status || 'all'}
          onChange={(e) =>
            updateViewState({
              filters: {
                ...filters,
                status: e.target.value === 'all' ? undefined : (e.target.value as ReviewStatus),
              },
            })
          }
          className="h-8 rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.anomalyType || 'all'}
          onChange={(e) =>
            updateViewState({
              filters: {
                ...filters,
                anomalyType: e.target.value === 'all' ? undefined : (e.target.value as AnomalyType | 'none'),
              },
            })
          }
          className="h-8 rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
        >
          {anomalyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="mx-2 h-5 w-px bg-pocket-border" />

        <div className="flex items-center gap-2 text-pocket-muted">
          <ArrowUpDown size={14} />
          <span className="text-xs font-medium">排序</span>
        </div>

        <select
          value={sortBy || 'originalRowNumber'}
          onChange={(e) =>
            updateViewState({ sortBy: e.target.value as keyof typeof sortByKeys })
          }
          className="h-8 rounded-md border border-pocket-border bg-pocket-bg px-2.5 text-xs text-pocket-text focus:border-pocket-accent/50 focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() =>
            updateViewState({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' })
          }
          className="flex h-8 items-center gap-1 rounded-md border border-pocket-border bg-pocket-bg px-2 text-xs text-pocket-text hover:bg-pocket-card"
        >
          {sortOrder === 'asc' ? '升序 ↑' : '降序 ↓'}
        </button>

        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-pocket-muted">共</span>
            <span className="font-medium text-pocket-text">{stats.total}</span>
            <span className="text-pocket-muted">条</span>
          </div>
          <StatusBadge status="usable" />
          <span className="text-pocket-muted">{stats.usable}</span>
          <StatusBadge status="pending" />
          <span className="text-pocket-muted">{stats.pending}</span>
          <StatusBadge status="unusable" />
          <span className="text-pocket-muted">{stats.unusable}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(filters.status || filters.anomalyType || filters.proteinName) && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.status && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-pocket-muted">状态:</span>
                <StatusBadge status={filters.status} />
                <button
                  onClick={() => updateViewState({ filters: { ...filters, status: undefined } })}
                  className="text-pocket-muted hover:text-pocket-text"
                >
                  <X size={11} />
                </button>
              </span>
            )}
            {filters.anomalyType && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-pocket-muted">异常:</span>
                {filters.anomalyType === 'none' ? (
                  <span className="text-[11px] text-pocket-muted">无异常</span>
                ) : (
                  <AnomalyBadge type={filters.anomalyType as AnomalyType} />
                )}
                <button
                  onClick={() => updateViewState({ filters: { ...filters, anomalyType: undefined } })}
                  className="text-pocket-muted hover:text-pocket-text"
                >
                  <X size={11} />
                </button>
              </span>
            )}
            {filters.proteinName && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11px] text-pocket-muted">搜索:</span>
                <span className="rounded-md border border-pocket-border bg-pocket-bg px-1.5 py-0.5 text-[11px] text-pocket-accent">
                  {filters.proteinName}
                </span>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                updateViewState({ filters: {} });
              }}
              className="text-[11px] text-pocket-accent hover:underline"
            >
              清除全部
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
