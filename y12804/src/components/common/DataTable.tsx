import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  className?: string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  highlightRow?: (row: T) => boolean;
  highlightClass?: string;
}

function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  className = '',
  emptyText = '暂无数据',
  onRowClick,
  highlightRow,
  highlightClass,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    const val = (row as Record<string, unknown>)[rowKey as string];
    return String(val ?? index);
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary-50 text-left">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'px-4 py-2.5 font-medium text-primary-700 text-xs uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.width && `w-[${col.width}]`
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-neutral-400"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const isHighlighted = highlightRow ? highlightRow(row) : false;
              return (
                <tr
                  key={getRowKey(row, index)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-primary-50',
                    isHighlighted && highlightClass
                      ? highlightClass
                      : isHighlighted
                      ? 'bg-supplement-50'
                      : ''
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key as string];
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-4 py-3 text-neutral-700',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.render ? col.render(row, index) : String(value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
