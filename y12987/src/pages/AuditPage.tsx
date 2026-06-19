import { useState, useEffect, useCallback } from 'react'
import { Filter, Download, Table2, GitBranch, Clock, User, Shield, Search } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const ACTION_TYPES = [
  { value: '', label: '全部' },
  { value: 'create', label: 'create' },
  { value: 'update', label: 'update' },
  { value: 'delete', label: 'delete' },
  { value: 'approve', label: 'approve' },
  { value: 'reject', label: 'reject' },
]

const ENTITY_TYPES = [
  { value: '', label: '全部' },
  { value: 'workorder', label: 'workorder' },
  { value: 'task', label: 'task' },
  { value: 'user', label: 'user' },
]

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  approve: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  reject: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const ACTION_DOT_COLORS: Record<string, string> = {
  create: 'bg-green-400',
  update: 'bg-blue-400',
  delete: 'bg-red-400',
  approve: 'bg-emerald-400',
  reject: 'bg-orange-400',
}

type ViewMode = 'table' | 'timeline'

export default function AuditPage() {
  const { auditLogs, auditTotal, fetchAuditLogs } = useAppStore()
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    startDate: '',
    endDate: '',
    operator: '',
  })

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({})

  const loadLogs = useCallback(async (p: number, f: Record<string, string>) => {
    const params: Record<string, string> = { page: String(p), pageSize: String(pageSize), ...f }
    await fetchAuditLogs(params)
  }, [fetchAuditLogs])

  useEffect(() => {
    loadLogs(page, appliedFilters)
  }, [page, appliedFilters, loadLogs])

  const handleSearch = () => {
    const params: Record<string, string> = {}
    if (filters.actionType) params.actionType = filters.actionType
    if (filters.entityType) params.entityType = filters.entityType
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    if (filters.operator) params.operator = filters.operator
    setPage(1)
    setAppliedFilters(params)
  }

  const handleExport = () => {
    const params = new URLSearchParams(appliedFilters)
    const url = `/api/audit-logs/export?${params.toString()}`
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const totalPages = Math.ceil(auditTotal / pageSize)

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const truncateId = (id: string) => id.length > 12 ? id.slice(0, 12) + '…' : id

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-brand-info" />
          <h1 className="text-2xl font-bold text-brand-text">审计日志</h1>
        </div>
        <p className="text-brand-muted text-sm mt-1.5 ml-9">权限审计与备份校验共用同一数据源</p>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-brand-muted text-sm">
          <Filter size={14} />
          <span>筛选条件</span>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-brand-muted">操作类型</label>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
              className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-info"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-brand-muted">对象类型</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
              className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-info"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-brand-muted">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-info"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-brand-muted">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              className="bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-info"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-brand-muted">操作人</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                value={filters.operator}
                onChange={(e) => setFilters((f) => ({ ...f, operator: e.target.value }))}
                placeholder="搜索操作人"
                className="bg-brand-bg border border-brand-border rounded-lg pl-8 pr-3 py-2 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:ring-1 focus:ring-brand-info"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-info text-white text-sm rounded-lg hover:bg-brand-info/90 transition-colors"
          >
            <Search size={14} />
            查询
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-elevated text-brand-text text-sm rounded-lg hover:bg-brand-elevated/80 border border-brand-border transition-colors"
          >
            <Download size={14} />
            导出 CSV
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-brand-surface border border-brand-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              viewMode === 'table' ? 'bg-brand-elevated text-brand-text' : 'text-brand-muted hover:text-brand-text'
            )}
          >
            <Table2 size={14} />
            表格
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              viewMode === 'timeline' ? 'bg-brand-elevated text-brand-text' : 'text-brand-muted hover:text-brand-text'
            )}
          >
            <GitBranch size={14} />
            时间线
          </button>
        </div>
        <span className="text-sm text-brand-muted">共 {auditTotal} 条记录</span>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-4 py-3 text-brand-muted font-medium">操作类型</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">对象类型</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">对象ID</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">操作人</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">操作时间</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">变更原因</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-brand-border/50 hover:bg-brand-elevated/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', ACTION_COLORS[log.actionType] || 'bg-brand-elevated text-brand-muted border-brand-border')}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-text">{log.entityType}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-brand-muted text-xs" title={log.entityId}>
                      {truncateId(log.entityId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-text">{log.operator}</td>
                  <td className="px-4 py-3 text-brand-muted">{formatTime(log.operatedAt)}</td>
                  <td className="px-4 py-3 text-brand-text max-w-xs truncate" title={log.reason}>{log.reason}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-brand-muted">暂无审计日志</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-brand-border" />
          <div className="space-y-4">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative flex gap-4">
                <div className={cn('absolute left-[-21px] top-3 w-3 h-3 rounded-full border-2 border-brand-surface', ACTION_DOT_COLORS[log.actionType] || 'bg-brand-muted')} />
                <div className="flex-1 bg-brand-surface border border-brand-border rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-brand-text">{log.operator}</span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', ACTION_COLORS[log.actionType] || 'bg-brand-elevated text-brand-muted border-brand-border')}>
                        {log.actionType}
                      </span>
                      <span className="text-brand-muted text-xs">{log.entityType}</span>
                      <span className="font-mono text-brand-muted text-xs" title={log.entityId}>{truncateId(log.entityId)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-brand-muted text-xs">
                      <Clock size={12} />
                      {formatTime(log.operatedAt)}
                    </div>
                  </div>
                  {log.reason && (
                    <p className="text-sm text-brand-text/80">{log.reason}</p>
                  )}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="py-12 text-center text-brand-muted">暂无审计日志</div>
            )}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>
          <span className="text-sm text-brand-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
