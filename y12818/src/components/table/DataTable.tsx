import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type TableOptions,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// 筛选配置类型
interface FilterConfig {
  columnId: string;
  placeholder?: string;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  striped?: boolean;
  emptyMessage?: ReactNode;
  className?: string;
  options?: Partial<TableOptions<TData>>;
}

// 基于 TanStack Table 的通用数据表格组件
export default function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = '搜索...',
  filters,
  striped = true,
  emptyMessage = '暂无数据',
  className,
  options,
}: DataTableProps<TData, TValue>) {
  // 排序状态
  const [sorting, setSorting] = useState<SortingState>([]);
  // 筛选状态
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // 全局搜索值
  const [globalFilter, setGlobalFilter] = useState('');

  // 初始化表格实例
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...options,
  });

  // 渲染排序指示器
  const renderSortIcon = (isSorted: false | 'asc' | 'desc') => {
    if (isSorted === 'asc') {
      return <ChevronUp size={14} className="shrink-0" />;
    }
    if (isSorted === 'desc') {
      return <ChevronDown size={14} className="shrink-0" />;
    }
    return (
      <ChevronDown
        size={14}
        className="shrink-0 opacity-30 group-hover:opacity-60 transition-opacity"
      />
    );
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* 工具栏：搜索和筛选 */}
      {(searchColumn || filters) && (
        <div className="flex flex-wrap items-center gap-3">
          {/* 全局搜索框 */}
          {searchColumn && (
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-10 w-64 rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                  aria-label="清除搜索"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* 列筛选器 */}
          {filters?.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            const value = (column.getFilterValue() as string) ?? '';

            return (
              <div key={filter.columnId} className="relative">
                <input
                  type="text"
                  placeholder={filter.placeholder || `筛选 ${filter.columnId}`}
                  value={value}
                  onChange={(e) => column.setFilterValue(e.target.value)}
                  className="h-10 w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 表格容器 */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* 表头 */}
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'px-4 py-3 text-left font-medium',
                          canSort && 'cursor-pointer select-none group',
                          'text-slate-700 dark:text-slate-300',
                        )}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {canSort && renderSortIcon(header.column.getIsSorted())}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* 表体 */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-slate-500 dark:text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      striped &&
                        rowIndex % 2 === 1 &&
                        'bg-slate-50/50 dark:bg-slate-800/30',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-slate-600 dark:text-slate-400"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部信息：数据统计 */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <div>
          共{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {table.getFilteredRowModel().rows.length}
          </span>{' '}
          条数据
        </div>
      </div>
    </div>
  );
}
