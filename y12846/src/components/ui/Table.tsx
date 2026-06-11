import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronRight, Search } from 'lucide-react'

export interface Column<T> {
  key: string
  title: string
  dataIndex?: keyof T
  render?: (value: any, record: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  filterable?: boolean
  filterOptions?: { label: string; value: string }[]
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey?: keyof T | ((record: T) => string)
  striped?: boolean
  expandable?: boolean
  expandedRowRender?: (record: T, index: number) => React.ReactNode
  emptyText?: React.ReactNode
  className?: string
  onRowClick?: (record: T, index: number) => void
  defaultSortKey?: string
  defaultSortOrder?: 'asc' | 'desc'
}

export interface TableContextValue {
  expandedRows: Set<string>
  toggleRow: (key: string) => void
}

const TableContext = React.createContext<TableContextValue | null>(null)

function getRowKey<T>(record: T, index: number, rowKey?: TableProps<T>['rowKey']): string {
  if (!rowKey) return String(index)
  if (typeof rowKey === 'function') return rowKey(record)
  return String(record[rowKey])
}

function sortData<T>(data: T[], key: string, order: 'asc' | 'desc', columns: Column<T>[]): T[] {
  const col = columns.find(c => c.key === key)
  if (!col) return data

  return [...data].sort((a, b) => {
    const aVal = col.dataIndex ? (a as any)[col.dataIndex] : undefined
    const bVal = col.dataIndex ? (b as any)[col.dataIndex] : undefined

    let comparison = 0
    if (aVal < bVal) comparison = -1
    else if (aVal > bVal) comparison = 1

    return order === 'asc' ? comparison : -comparison
  })
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  striped = true,
  expandable = false,
  expandedRowRender,
  emptyText = '暂无数据',
  className,
  onRowClick,
  defaultSortKey,
  defaultSortOrder,
}: TableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | undefined>(defaultSortKey)
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>(defaultSortOrder || 'asc')
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
  const [searchValue, setSearchValue] = React.useState('')

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const filteredData = React.useMemo(() => {
    let result = [...data]

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) {
        const col = columns.find(c => c.key === key)
        if (col && col.dataIndex) {
          result = result.filter(item => String((item as any)[col.dataIndex!]) === value)
        }
      }
    })

    if (searchValue) {
      result = result.filter(item =>
        columns.some(col => {
          const val = col.dataIndex ? (item as any)[col.dataIndex] : undefined
          return val !== undefined && String(val).toLowerCase().includes(searchValue.toLowerCase())
        })
      )
    }

    if (sortKey) {
      result = sortData(result, sortKey, sortOrder, columns)
    }

    return result
  }, [data, sortKey, sortOrder, filterValues, searchValue, columns])

  const contextValue: TableContextValue = {
    expandedRows,
    toggleRow,
  }

  const hasFilterable = columns.some(c => c.filterable)

  return (
    <TableContext.Provider value={contextValue}>
      <div className={cn('w-full', className)}>
        {hasFilterable && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {columns.filter(c => c.filterable).map(col => (
              <select
                key={col.key}
                value={filterValues[col.key] || ''}
                onChange={e => setFilterValues(prev => ({ ...prev, [col.key]: e.target.value }))}
                className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">{col.title} - 全部</option>
                {col.filterOptions?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                className="h-9 w-64 rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-neutral-200 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {expandable && (
                    <th className="w-10 px-4 py-3 text-left"></th>
                  )}
                  {columns.map(col => (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={cn(
                        'px-4 py-3 font-medium text-neutral-700 transition-all duration-200',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.sortable && 'cursor-pointer hover:bg-neutral-100 select-none'
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.title}
                        {col.sortable && (
                          <span className="text-neutral-400">
                            {sortKey === col.key ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )
                            ) : (
                              <ChevronsUpDown className="h-4 w-4" />
                            )}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (expandable ? 1 : 0)}
                      className="px-4 py-12 text-center text-neutral-500"
                    >
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => {
                    const key = getRowKey(record, index, rowKey)
                    const isExpanded = expandedRows.has(key)

                    return (
                      <React.Fragment key={key}>
                        <tr
                          className={cn(
                            'border-b border-neutral-100 transition-all duration-200',
                            striped && index % 2 === 1 && 'bg-neutral-50/50',
                            onRowClick && 'cursor-pointer hover:bg-brand-50/50'
                          )}
                          onClick={() => onRowClick?.(record, index)}
                        >
                          {expandable && (
                            <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => toggleRow(key)}
                                className="p-1 rounded hover:bg-neutral-100 transition-all duration-200 text-neutral-500 hover:text-neutral-700"
                              >
                                <ChevronRight
                                  className={cn(
                                    'h-4 w-4 transition-transform duration-200',
                                    isExpanded && 'rotate-90'
                                  )}
                                />
                              </button>
                            </td>
                          )}
                          {columns.map(col => {
                            const value = col.dataIndex ? (record as any)[col.dataIndex] : undefined
                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  'px-4 py-3 text-neutral-700',
                                  col.align === 'center' && 'text-center',
                                  col.align === 'right' && 'text-right'
                                )}
                              >
                                {col.render ? col.render(value, record, index) : value}
                              </td>
                            )
                          })}
                        </tr>
                        {expandable && isExpanded && expandedRowRender && (
                          <tr className="bg-neutral-50 border-b border-neutral-100">
                            <td colSpan={columns.length + 1} className="px-4 py-4">
                              {expandedRowRender(record, index)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TableContext.Provider>
  )
}

export default Table
