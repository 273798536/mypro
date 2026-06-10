import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { GitCompare, Table, List, Eye, EyeOff, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import DiffHighlight from './DiffHighlight'
import type { CompareViewProps, FieldConfig } from '@/types'

type DiffType = 'same' | 'add' | 'delete' | 'modify'

interface FieldDiff {
  key: string
  label: string
  type: DiffType
  oldValue: unknown
  newValue: unknown
}

function formatValue(value: unknown, field?: FieldConfig): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (field?.formatter) {
    return field.formatter(value)
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function getDiffType(oldVal: unknown, newVal: unknown): DiffType {
  const oldExists = oldVal !== undefined && oldVal !== null
  const newExists = newVal !== undefined && newVal !== null

  if (!oldExists && newExists) return 'add'
  if (oldExists && !newExists) return 'delete'
  if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) return 'modify'
  return 'same'
}

export default function CompareView({
  oldData,
  newData,
  fields,
  mode = 'table',
  showOnlyDiff = false,
}: CompareViewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'keyValue'>(mode)
  const [onlyDiff, setOnlyDiff] = useState(showOnlyDiff)
  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const isSyncing = useRef(false)

  const fieldDiffs: FieldDiff[] = useMemo(() => {
    return fields.map((field) => {
      const oldVal = oldData[field.key]
      const newVal = newData[field.key]
      return {
        key: field.key,
        label: field.label,
        type: getDiffType(oldVal, newVal),
        oldValue: oldVal,
        newValue: newVal,
      }
    })
  }, [oldData, newData, fields])

  const diffStats = useMemo(() => {
    const stats = {
      total: fields.length,
      same: 0,
      add: 0,
      delete: 0,
      modify: 0,
      changed: 0,
    }
    fieldDiffs.forEach((diff) => {
      stats[diff.type]++
      if (diff.type !== 'same') {
        stats.changed++
      }
    })
    return stats
  }, [fieldDiffs, fields.length])

  const visibleDiffs = useMemo(() => {
    if (onlyDiff) {
      return fieldDiffs.filter((d) => d.type !== 'same')
    }
    return fieldDiffs
  }, [fieldDiffs, onlyDiff])

  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncing.current) return

    isSyncing.current = true
    requestAnimationFrame(() => {
      const leftEl = leftRef.current
      const rightEl = rightRef.current

      if (!leftEl || !rightEl) {
        isSyncing.current = false
        return
      }

      const sourceEl = source === 'left' ? leftEl : rightEl
      const targetEl = source === 'left' ? rightEl : leftEl

      const scrollPercentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight)
      const targetScrollTop = scrollPercentage * (targetEl.scrollHeight - targetEl.clientHeight)

      targetEl.scrollTop = targetScrollTop
      isSyncing.current = false
    })
  }, [])

  useEffect(() => {
    const leftEl = leftRef.current
    const rightEl = rightRef.current
    if (!leftEl || !rightEl) return

    const handleLeftScroll = () => handleScroll('left')
    const handleRightScroll = () => handleScroll('right')

    leftEl.addEventListener('scroll', handleLeftScroll)
    rightEl.addEventListener('scroll', handleRightScroll)

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll)
      rightEl.removeEventListener('scroll', handleRightScroll)
    }
  }, [handleScroll])

  const getRowBgClass = (type: DiffType, side: 'left' | 'right') => {
    if (type === 'same') return 'bg-white/[0.02]'
    if (type === 'add') return side === 'right' ? 'bg-green-400/10' : 'bg-white/[0.02]'
    if (type === 'delete') return side === 'left' ? 'bg-red-400/10' : 'bg-white/[0.02]'
    return 'bg-yellow-400/10'
  }

  const renderTableMode = () => (
    <div className="flex h-full">
      <div
        ref={leftRef}
        className="scrollbar-thin w-1/2 overflow-auto border-r border-white/10"
      >
        <div className="sticky top-0 z-10 bg-lab-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-lab-200">旧版本</span>
            <span className="text-xs text-lab-400">原始数据</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {visibleDiffs.map((diff) => (
              <tr
                key={diff.key}
                className={cn(
                  'border-b border-white/5 transition-colors duration-200',
                  getRowBgClass(diff.type, 'left'),
                )}
              >
                <td className="w-32 px-4 py-3 font-medium text-lab-300">{diff.label}</td>
                <td className="px-4 py-3 font-mono text-lab-100">
                  {diff.type === 'add' ? (
                    <span className="italic text-lab-500">无</span>
                  ) : diff.type === 'delete' ? (
                    <span className="text-red-400 line-through">
                      {formatValue(diff.oldValue, fields.find((f) => f.key === diff.key))}
                    </span>
                  ) : diff.type === 'modify' ? (
                    <span className="text-yellow-300 line-through">
                      {formatValue(diff.oldValue, fields.find((f) => f.key === diff.key))}
                    </span>
                  ) : (
                    formatValue(diff.oldValue, fields.find((f) => f.key === diff.key))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        ref={rightRef}
        className="scrollbar-thin w-1/2 overflow-auto"
      >
        <div className="sticky top-0 z-10 bg-lab-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-lab-200">新版本</span>
            <span className="text-xs text-lab-400">修改后数据</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {visibleDiffs.map((diff) => (
              <tr
                key={diff.key}
                className={cn(
                  'border-b border-white/5 transition-colors duration-200',
                  getRowBgClass(diff.type, 'right'),
                )}
              >
                <td className="w-32 px-4 py-3 font-medium text-lab-300">{diff.label}</td>
                <td className="px-4 py-3 font-mono text-lab-100">
                  {diff.type === 'delete' ? (
                    <span className="italic text-lab-500">已删除</span>
                  ) : diff.type === 'add' ? (
                    <span className="text-green-400">
                      {formatValue(diff.newValue, fields.find((f) => f.key === diff.key))}
                    </span>
                  ) : diff.type === 'modify' ? (
                    <span className="text-green-400">
                      {formatValue(diff.newValue, fields.find((f) => f.key === diff.key))}
                    </span>
                  ) : (
                    formatValue(diff.newValue, fields.find((f) => f.key === diff.key))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderKeyValueMode = () => (
    <div className="space-y-3">
      {visibleDiffs.map((diff) => {
        const fieldConfig = fields.find((f) => f.key === diff.key)
        const oldStr = formatValue(diff.oldValue, fieldConfig)
        const newStr = formatValue(diff.newValue, fieldConfig)

        return (
          <div
            key={diff.key}
            className={cn(
              'glass-card overflow-hidden transition-all duration-200',
              diff.type !== 'same' && 'ring-1 ring-white/10',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between border-b px-4 py-2',
                diff.type === 'add' && 'border-green-400/20 bg-green-400/5',
                diff.type === 'delete' && 'border-red-400/20 bg-red-400/5',
                diff.type === 'modify' && 'border-yellow-400/20 bg-yellow-400/5',
                diff.type === 'same' && 'border-white/5 bg-white/[0.02]',
              )}
            >
              <span className="font-medium text-white">{diff.label}</span>
              <span
                className={cn(
                  'status-badge',
                  diff.type === 'add' && 'bg-green-400/20 text-green-400',
                  diff.type === 'delete' && 'bg-red-400/20 text-red-400',
                  diff.type === 'modify' && 'bg-yellow-400/20 text-yellow-400',
                  diff.type === 'same' && 'bg-white/10 text-lab-300',
                )}
              >
                {diff.type === 'add' ? '新增' : diff.type === 'delete' ? '删除' : diff.type === 'modify' ? '修改' : '未变更'}
              </span>
            </div>
            <div className="p-4">
              {diff.type === 'same' ? (
                <div className="font-mono text-sm text-lab-200">{oldStr || <span className="italic opacity-60">空</span>}</div>
              ) : (
                <DiffHighlight oldValue={oldStr} newValue={newStr} type={diff.type} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/20">
            <GitCompare className="h-5 w-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">数据对比</h3>
            <p className="text-sm text-lab-300">
              共 {diffStats.total} 个字段，
              <span className="text-yellow-400"> {diffStats.changed} 处变更</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-lab-300">新增 {diffStats.add}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-lab-300">删除 {diffStats.delete}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-lab-300">修改 {diffStats.modify}</span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button
            onClick={() => setOnlyDiff(!onlyDiff)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              onlyDiff ? 'bg-teal-400/20 text-teal-400' : 'bg-white/5 text-lab-300 hover:bg-white/10 hover:text-white',
            )}
          >
            {onlyDiff ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            仅显示差异
          </button>

          <div className="flex rounded-lg bg-white/5 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'table' ? 'bg-white/10 text-white' : 'text-lab-300 hover:text-white',
              )}
            >
              <Table className="h-3.5 w-3.5" />
              表格
            </button>
            <button
              onClick={() => setViewMode('keyValue')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                viewMode === 'keyValue' ? 'bg-white/10 text-white' : 'text-lab-300 hover:text-white',
              )}
            >
              <List className="h-3.5 w-3.5" />
              键值对
            </button>
          </div>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-lab-300 transition-colors hover:bg-white/10 hover:text-white"
            title="联动滚动"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={cn('flex-1 overflow-hidden', viewMode === 'keyValue' && 'scrollbar-thin overflow-auto p-4')}>
        {visibleDiffs.length === 0 ? (
          <div className="flex h-full items-center justify-center py-12 text-lab-300">
            <div className="text-center">
              <GitCompare className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>暂无差异数据</p>
            </div>
          </div>
        ) : viewMode === 'table' ? (
          renderTableMode()
        ) : (
          renderKeyValueMode()
        )}
      </div>
    </div>
  )
}
