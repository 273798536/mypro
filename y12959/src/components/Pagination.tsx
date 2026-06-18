import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis')
    }

    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis')
    }

    pages.push(totalPages)

    return pages
  }

  const pageNumbers = getPageNumbers()

  const renderPageButton = (page: number | 'ellipsis') => {
    if (page === 'ellipsis') {
      return (
        <span
          key={`ellipsis-${Math.random()}`}
          className="inline-flex h-8 w-8 items-center justify-center text-audit-400"
        >
          …
        </span>
      )
    }

    const isActive = page === currentPage

    return (
      <button
        key={page}
        type="button"
        onClick={() => onPageChange(page)}
        disabled={isActive}
        className={cn(
          'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-audit-600 text-white shadow-sm'
            : 'text-audit-600 hover:bg-audit-100 border border-transparent hover:border-audit-200',
          'disabled:cursor-not-allowed'
        )}
      >
        {page}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-4 border-t border-audit-100 bg-audit-50/30 px-4 py-3 sm:flex-row',
        className
      )}
    >
      <div className="flex items-center gap-4 text-sm text-audit-600">
        <span>
          显示 <span className="font-semibold text-audit-800">{startItem}</span>
          {' - '}
          <span className="font-semibold text-audit-800">{endItem}</span>
          {' / 共 '}
          <span className="font-semibold text-audit-800">{totalItems}</span>
          {' 条'}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-audit-500">每页</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="select h-8 w-20 py-1 text-xs"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-audit-500 transition-colors hover:bg-audit-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="第一页"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-audit-500 transition-colors hover:bg-audit-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="mx-1 flex items-center gap-1">
          {pageNumbers.map(renderPageButton)}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-audit-500 transition-colors hover:bg-audit-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-audit-500 transition-colors hover:bg-audit-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="最后一页"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
