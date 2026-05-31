import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  width?: string;
  className?: string;
  render?: (value: T[keyof T] | undefined, row: T, index: number) => React.ReactNode;
}

export interface SortConfig<T> {
  key: keyof T | string;
  direction: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  onRowClick?: (row: T, index: number) => void;
  pagination?: boolean;
  pageSize?: number;
  defaultSort?: SortConfig<T>;
  onSortChange?: (sort: SortConfig<T>) => void;
  emptyState?: {
    type?: 'default' | 'search' | 'error' | 'no-data';
    title?: string;
    description?: string;
    action?: { label: string; onClick: () => void };
  };
  className?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  pagination = true,
  pageSize = 10,
  defaultSort,
  onSortChange,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | undefined>(defaultSort);
  const [localSelectedRows, setLocalSelectedRows] = useState<T[]>(selectedRows);

  const effectiveSelectedRows = onSelectionChange ? selectedRows : localSelectedRows;
  const setEffectiveSelectedRows = onSelectionChange || setLocalSelectedRows;

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];
      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      return sortConfig.direction === 'asc' ? 1 : -1;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: keyof T | string) => {
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      newDirection = 'desc';
    }
    const newSort = { key, direction: newDirection };
    setSortConfig(newSort);
    onSortChange?.(newSort);
  };

  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey]);
  };

  const isRowSelected = (row: T): boolean => {
    const key = getRowKey(row);
    return effectiveSelectedRows.some(
      (r) => getRowKey(r) === key
    );
  };

  const handleSelectAll = () => {
    if (effectiveSelectedRows.length === paginatedData.length) {
      setEffectiveSelectedRows([]);
    } else {
      setEffectiveSelectedRows([...paginatedData]);
    }
  };

  const handleSelectRow = (row: T) => {
    const key = getRowKey(row);
    const isSelected = effectiveSelectedRows.some(
      (r) => getRowKey(r) === key
    );
    if (isSelected) {
      setEffectiveSelectedRows(
        effectiveSelectedRows.filter((r) => getRowKey(r) !== key)
      );
    } else {
      setEffectiveSelectedRows([...effectiveSelectedRows, row]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="加载中..." />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        type={emptyState?.type || 'no-data'}
        title={emptyState?.title}
        description={emptyState?.description}
        action={emptyState?.action}
      />
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      paginatedData.length > 0 &&
                      effectiveSelectedRows.length === paginatedData.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-700 focus:ring-primary-700"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300',
                    column.sortable && 'cursor-pointer select-none',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && (
                      <span className="text-slate-400">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="w-4 h-4 text-primary-700" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-primary-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => {
              const rowKeyValue = getRowKey(row);
              const selected = isRowSelected(row);
              return (
                <tr
                  key={rowKeyValue}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-700/50',
                    'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                    selected && 'bg-primary-50 dark:bg-primary-900/20',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(row);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-primary-700 focus:ring-primary-700"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-slate-900 dark:text-slate-100',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(
                            row[column.key as keyof T] as T[keyof T] | undefined,
                            row,
                            index
                          )
                        : (row[column.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {sortedData.length} 条记录，第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="第一页"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'min-w-9 h-9 px-3 rounded-lg text-sm font-medium transition-colors',
                    currentPage === pageNum
                      ? 'bg-primary-700 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="最后一页"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
