import { useEffect, useState, useCallback } from 'react'
import { Clock, ChevronDown, ChevronRight, Filter, RefreshCw } from 'lucide-react'
import { useApi } from '@/hooks/useApi'

interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  field: string
  old_value: string
  new_value: string
  reason: string
  impact_amount: number
  created_at: string
  changed_by: string
  details?: string
}

const ENTITY_LABELS: Record<string, string> = {
  order: '订单',
  return: '退货',
  accrual: '预提',
  exception: '异常',
}

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const api = useApi()

  const fetchLogs = useCallback(() => {
    const params = new URLSearchParams()
    if (entityType) params.set('entityType', entityType)
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    api.get<{ success: boolean; data: AuditLog[] }>(`/api/audit-logs?${params}`).then((res) => setLogs(res.data)).catch(() => setLogs([]))
  }, [entityType, fromDate, toDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">审计日志</h1>
        <button onClick={fetchLogs} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm p-4">
        <Filter size={16} className="text-gray-400" />
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
        >
          <option value="">全部类型</option>
          <option value="order">订单</option>
          <option value="return">退货</option>
          <option value="accrual">预提</option>
          <option value="exception">异常</option>
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="开始日期"
        />
        <span className="text-gray-400">至</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-300"
          placeholder="结束日期"
        />
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            return (
              <div key={log.id} className="relative pl-14">
                <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-navy-100 flex items-center justify-center">
                  <Clock size={10} className="text-navy-500" />
                </div>

                <div
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-navy-50 text-navy-500">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </span>
                        <span className="text-sm font-medium text-navy-500">#{log.entity_id.slice(0, 8)}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatTime(log.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-1">
                      <span className="text-gray-500">字段:</span>
                      <span className="font-medium text-navy-500">{log.field}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-0.5 bg-coral-50 text-coral-500 rounded text-xs line-through">
                        {log.old_value}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded text-xs">
                        {log.new_value}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>操作人: {log.changed_by}</span>
                      {log.impact_amount !== 0 && (
                        <span className={log.impact_amount < 0 ? 'text-coral-500' : 'text-emerald-500'}>
                          影响金额: {log.impact_amount < 0 ? '-' : '+'}€{Math.abs(log.impact_amount).toLocaleString('zh-CN')}
                        </span>
                      )}
                      <span className="ml-auto">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">原因: </span>
                          <span className="text-navy-500">{log.reason}</span>
                        </div>
                        {log.details && (
                          <div>
                            <span className="text-gray-500">详情: </span>
                            <span className="text-navy-500">{log.details}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">预提影响: </span>
                          <span className={log.impact_amount < 0 ? 'text-coral-500' : 'text-emerald-500'}>
                            {log.impact_amount < 0 ? '-' : '+'}€{Math.abs(log.impact_amount).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {logs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400">暂无审计日志</p>
        </div>
      )}
    </div>
  )
}
