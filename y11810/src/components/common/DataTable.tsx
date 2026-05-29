import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  title: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: number | string;
  className?: string;
}

export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number, pageSize: number) => void;
  rowKey?: string | ((row: T) => string);
  expandable?: {
    expandedRowRender?: (row: T, index: number) => React.ReactNode;
  };
  className?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  rowKey = "id",
  expandable,
  className,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const hasExpand = !!expandable?.expandedRowRender;
  const colSpan = columns.length + (hasExpand ? 1 : 0);

  const getRowKey = (row: T, index: number): string =>
    typeof rowKey === "function" ? rowKey(row) : String((row as Record<string, unknown>)[rowKey] ?? index);

  const toggleExpand = (key: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  const btnClass = (disabled: boolean) =>
    cn(
      "rounded px-3 py-1 text-[13px]",
      disabled
        ? "cursor-not-allowed text-gray-300"
        : "text-gray-600 hover:bg-gray-100"
    );

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#F7F8FA" }}>
              {hasExpand && (
                <th className="w-10 px-4 py-3 text-left text-[12px] font-medium text-[#86909C]" />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-[12px] font-medium text-[#86909C]",
                    col.className
                  )}
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-gray-500">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-[14px]">加载中...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-gray-500">
                  <p className="text-[14px]">暂无数据</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row, index);
                const isExpanded = expandedRows.has(key);
                return (
                  <>
                    <tr
                      key={key}
                      className={cn(
                        "border-t border-gray-100 transition-colors hover:bg-gray-50",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      {hasExpand && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(key)}
                            className="p-0.5 text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-4 py-3 text-[13px] text-gray-700", col.className)}
                        >
                          {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                    {hasExpand && isExpanded && (
                      <tr className="bg-gray-50/80">
                        <td colSpan={colSpan} className="px-4 py-4">
                          {expandable!.expandedRowRender!(row, index)}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-[13px] text-gray-500">共 {pagination.total} 条记录</p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagination.current === 1}
              onClick={() => onPageChange?.(pagination.current - 1, pagination.pageSize)}
              className={btnClass(pagination.current === 1)}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange?.(page, pagination.pageSize)}
                className={cn(
                  "min-w-[32px] rounded px-2 py-1 text-[13px]",
                  page === pagination.current
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {page}
              </button>
            ))}
            <button
              disabled={pagination.current === totalPages}
              onClick={() => onPageChange?.(pagination.current + 1, pagination.pageSize)}
              className={btnClass(pagination.current === totalPages)}
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
