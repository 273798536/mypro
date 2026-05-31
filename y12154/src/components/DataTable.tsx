import React, { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  rowClassName?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  enablePagination?: boolean;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = '搜索...',
  rowClassName,
  onRowClick,
  enablePagination = true,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [{ pageIndex, pageSize: currentPageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      sorting,
      globalFilter,
      pagination: enablePagination ? { pageIndex, pageSize: currentPageSize } : undefined,
    },
  });

  const filteredColumns = useMemo(() => {
    if (!searchColumn) return columns;
    return columns.filter(col => col.id === searchColumn);
  }, [columns, searchColumn]);

  return (
    <div className="w-full">
      {searchColumn && (
        <div className="flex items-center py-4">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={e => setGlobalFilter(String(e.target.value))}
            className="max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          />
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
                        canSort && 'cursor-pointer select-none hover:bg-slate-100 transition-colors'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center space-x-1">
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {canSort && (
                          <span className="text-slate-400">
                            {{
                              asc: <ChevronUp className="w-4 h-4" />,
                              desc: <ChevronDown className="w-4 h-4" />,
                              false: <ChevronsUpDown className="w-4 h-4" />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white divide-y divide-slate-200">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={cn(
                  'hover:bg-slate-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row.original)
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getRowModel().rows.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">暂无数据</p>
          </div>
        )}
      </div>

      {enablePagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-slate-500">
            共 {table.getFilteredRowModel().rows.length} 条记录，
            当前第 {pageIndex + 1} / {table.getPageCount()} 页
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              上一页
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                let pageNum: number;
                if (table.getPageCount() <= 5) {
                  pageNum = i;
                } else if (pageIndex < 2) {
                  pageNum = i;
                } else if (pageIndex > table.getPageCount() - 3) {
                  pageNum = table.getPageCount() - 5 + i;
                } else {
                  pageNum = pageIndex - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pageIndex ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => table.setPageIndex(pageNum)}
                    className="w-9 h-9 p-0"
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
