import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
}

function formatValue(value: unknown): string {
  if (typeof value === 'number' && value > 1000) {
    return value.toLocaleString('zh-CN');
  }
  return String(value ?? '');
}

export default function DataTable<T extends { id?: string }>({
  columns,
  data,
  onRowClick,
  selectedId,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead className="sticky top-0 bg-white shadow-sm z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider',
                  col.width && `w-[${col.width}]`
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {data.map((row, index) => {
            const rowId = row.id ?? String(index);
            const isSelected = selectedId && row.id === selectedId;
            return (
              <tr
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                  'hover:bg-teal-50',
                  isSelected && 'bg-teal-50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                    {col.render ? col.render(row) : formatValue(row[col.key as keyof T])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          暂无数据
        </div>
      )}
    </div>
  );
}
