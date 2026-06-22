import React from 'react';
import { cn } from '../../lib/utils';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey: keyof T | ((row: T) => string);
  className?: string;
}

function Table<T>({
  columns,
  data,
  onRowClick,
  rowKey,
  className,
}: TableProps<T>) {
  const getKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    return String(row[rowKey] ?? index);
  };

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-ink-600 uppercase tracking-wider font-serif bg-parchment-100 border-b border-parchment-200',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.width && `w-[${column.width}]`
                )}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={getKey(row, index)}
              className={cn(
                'border-b border-parchment-100 transition-colors duration-150',
                onRowClick && 'hover:bg-parchment-50 cursor-pointer'
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-sm text-charcoal-700 font-mono',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table as <T>(props: TableProps<T>) => JSX.Element;
