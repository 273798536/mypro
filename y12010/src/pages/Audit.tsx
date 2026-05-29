import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/utils/api'
import {
  Search,
  Filter,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Shield,
  Lock,
  Unlock,
  Trash2,
  FileUp,
  Plus,
  Edit3,
  X,
  Link2,
  AlertCircle,
} from 'lucide-react'

type OperationType = 'create' | 'update' | 'lock' | 'release' | 'delete' | 'import'
type SourceType = 'manual' | 'import' | 'system'

interface FieldChange {
  before: any
  after: any
}

interface AuditLog {
  id: string
  timestamp: string
  operation: OperationType
  entityType: string
  entityId: string
  operator: string
  source: SourceType
  sourceFile?: string
  sourceLine?: number
  label: string
  changes?: Record<string, FieldChange>
}

interface TraceData {
  entityId: string
  entityType: string
  marginLock: {
    id: string
    amount: number
    status: string
    enterpriseName: string
    lockedAt: string
    [key: string]: any
  } | null
  order: {
    id: string
    orderNo: string
    status: string
    quantity: number
    price: number
    [key: string]: any
  } | null
  releaseRule: {
    id: string
    ruleName: string
    condition: string
    action: string
    [key: string]: any
  } | null
  auditTrail: AuditLog[]
}

const operationConfig: Record<OperationType, { label: string; color: string; bg: string; border: string; dot: string; icon: typeof Plus }> = {
  create: { label: '创建', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', dot: 'bg-teal-500', icon: Plus },
  update: { label: '更新', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', icon: Edit3 },
  lock: { label: '锁定保证金', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500', icon: Lock },
  release: { label: '释放保证金', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: Unlock },
  delete: { label: '删除', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', icon: Trash2 },
  import: { label: '导入数据', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', icon: FileUp },
}

const sourceConfig: Record<SourceType, { label: string; color: string; bg: string }> = {
  manual: { label: '手工录入', color: 'text-blue-700', bg: 'bg-blue-100' },
  import: { label: '文件导入', color: 'text-amber-700', bg: 'bg-amber-100' },
  system: { label: '系统自动', color: 'text-slate-600', bg: 'bg-slate-100' },
}

const entityTypeLabels: Record<string, string> = {
  margin: '保证金',
  order: '订单',
  rule: '释放规则',
  import: '导入记录',
}

function formatDate(ts: string) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(ts: string) {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function SourceBadge({ source, sourceFile, sourceLine }: { source: SourceType; sourceFile?: string; sourceLine?: number }) {
  const cfg = sourceConfig[source]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
      {source === 'import' ? <FileUp className="w-3 h-3" /> : source === 'manual' ? <User className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {cfg.label}
      {source === 'import' && sourceFile && (
        <span className="text-[10px] opacity-75">
          ({sourceFile}{sourceLine ? ` 第${sourceLine}行` : ''})
        </span>
      )}
    </span>
  )
}

function ValueDiff({ field, change }: { field: string; change: FieldChange }) {
  const isChanged = String(change.before) !== String(change.after)
  return (
    <div className={`grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs py-1.5 px-2 rounded ${isChanged ? 'bg-amber-50' : ''}`}>
      <span className="text-slate-500 font-medium">{field}</span>
      <span className={`font-mono-data text-right ${isChanged ? 'text-red-500 line-through' : 'text-slate-600'}`}>
        {String(change.before ?? '-')}
      </span>
      <span className={`font-mono-data text-right ${isChanged ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`}>
        {String(change.after ?? '-')}
      </span>
    </div>
  )
}

function TimelineNode({ log, onTrace }: { log: AuditLog; onTrace: (entityType: string, entityId: string) => void }) {
  const cfg = operationConfig[log.operation]
  const Icon = cfg.icon
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center w-20 pt-1 flex-shrink-0">
        <span className="font-mono-data text-xs text-slate-600">{formatDate(log.timestamp)}</span>
        <span className="font-mono-data text-[11px] text-slate-400">{formatTime(log.timestamp)}</span>
      </div>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-3.5 h-3.5 rounded-full ${cfg.dot} ring-4 ring-white shadow-sm z-10`} />
        <div className="w-0.5 flex-1 bg-slate-200 -mt-0.5" />
      </div>
      <div className={`flex-1 mb-6 p-4 rounded-lg border ${cfg.border} ${cfg.bg} transition-shadow hover:shadow-md`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`font-semibold text-sm ${cfg.color}`}>{log.label}</span>
            <span className="badge bg-white/70 text-slate-500 text-[10px]">
              {entityTypeLabels[log.entityType] || log.entityType}
            </span>
          </div>
          <button
            onClick={() => onTrace(log.entityType, log.entityId)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            追溯
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-500">
            <User className="w-3 h-3 inline mr-1" />
            {log.operator}
          </span>
          <SourceBadge source={log.source} sourceFile={log.sourceFile} sourceLine={log.sourceLine} />
        </div>
        {log.source === 'import' && log.sourceFile && (
          <div className="text-[11px] text-amber-600 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            来源：{log.sourceFile}{log.sourceLine ? ` 第${log.sourceLine}行` : ''}
          </div>
        )}
        {log.changes && Object.keys(log.changes).length > 0 && (
          <div className="mt-2 bg-white/60 rounded-md border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[10px] font-semibold text-slate-400 px-2 pt-2 pb-1 uppercase tracking-wider">
              <span>字段</span>
              <span className="text-right">变更前</span>
              <span className="text-right">变更后</span>
            </div>
            {Object.entries(log.changes).map(([field, change]) => (
              <ValueDiff key={field} field={field} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TracePanel({ data, onClose }: { data: TraceData; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const nodes = [
    { key: 'marginLock', label: '保证金锁定', icon: Shield, data: data.marginLock, fields: data.marginLock ? [
      { k: 'ID', v: data.marginLock.id },
      { k: '金额', v: `¥${data.marginLock.amount?.toLocaleString()}` },
      { k: '状态', v: data.marginLock.status },
      { k: '企业', v: data.marginLock.enterpriseName },
      { k: '锁定时间', v: data.marginLock.lockedAt },
    ] : [] },
    { key: 'order', label: '订单状态', icon: FileText, data: data.order, fields: data.order ? [
      { k: '订单号', v: data.order.orderNo },
      { k: '状态', v: data.order.status },
      { k: '数量', v: data.order.quantity },
      { k: '价格', v: `¥${data.order.price}` },
    ] : [] },
    { key: 'releaseRule', label: '释放规则', icon: Unlock, data: data.releaseRule, fields: data.releaseRule ? [
      { k: '规则名', v: data.releaseRule.ruleName },
      { k: '条件', v: data.releaseRule.condition },
      { k: '动作', v: data.releaseRule.action },
    ] : [] },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-xl flex flex-col overflow-hidden animate-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-700 to-teal-600">
          <div>
            <h3 className="text-white font-display font-bold text-lg">链路追踪</h3>
            <p className="text-teal-200 text-xs mt-0.5">
              {entityTypeLabels[data.entityType] || data.entityType} · {data.entityId}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-start gap-0 overflow-x-auto pb-4">
            {nodes.map((node, i) => {
              const Icon = node.icon
              const isExpanded = expanded === node.key
              return (
                <div key={node.key} className="flex items-start flex-shrink-0">
                  <div className="w-52">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : node.key)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        node.data
                          ? 'border-teal-200 bg-teal-50/50 hover:border-teal-400 hover:shadow-md'
                          : 'border-slate-200 bg-slate-50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-lg ${node.data ? 'bg-teal-600 text-white' : 'bg-slate-300 text-white'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-slate-800">{node.label}</span>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
                      </div>
                      {node.data ? (
                        <div className="space-y-1">
                          {node.fields.slice(0, 2).map(f => (
                            <div key={f.k} className="flex justify-between text-[11px]">
                              <span className="text-slate-400">{f.k}</span>
                              <span className="font-mono-data text-slate-700">{f.v}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">暂无数据</p>
                      )}
                    </button>
                    {isExpanded && node.data && (
                      <div className="mt-2 mx-1 p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                        {node.fields.map((f: { k: string; v: string | number }) => (
                          <div key={f.k} className="flex justify-between text-xs">
                            <span className="text-slate-400">{f.k}</span>
                            <span className="font-mono-data text-slate-700 font-medium">{f.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {i < nodes.length - 1 && (
                    <div className="flex items-center h-16 px-2 flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {data.auditTrail && data.auditTrail.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                关联审计记录
              </h4>
              <div className="space-y-2">
                {data.auditTrail.map(log => {
                  const cfg = operationConfig[log.operation]
                  return (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className={`font-medium ${cfg.color}`}>{log.label}</span>
                      <span className="text-slate-400">{log.operator}</span>
                      <span className="font-mono-data text-slate-400 ml-auto">{formatDate(log.timestamp)} {formatTime(log.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Audit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [entityType, setEntityType] = useState(searchParams.get('entityType') || '')
  const [entityId, setEntityId] = useState(searchParams.get('id') || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [traceLoading, setTraceLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (entityType) params.entityType = entityType
      if (entityId) params.entityId = entityId
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await api.audit.logs(params)
      const logsArr = Array.isArray(res) ? res : (res.logs || [])
      setLogs(logsArr)
      setTotal(res.total || logsArr.length)
    } catch {
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, startDate, endDate])

  const handleTrace = useCallback(async (type: string, id: string) => {
    setTraceLoading(true)
    try {
      const res = await api.audit.trace(type, id)
      setTraceData(res)
      setSearchParams({ entityType: type, id })
    } catch {
      setTraceData(null)
    } finally {
      setTraceLoading(false)
    }
  }, [setSearchParams])

  useEffect(() => {
    const urlType = searchParams.get('entityType')
    const urlId = searchParams.get('id')
    if (urlType && urlId) {
      handleTrace(urlType, urlId)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">审计追溯</h1>
        <p className="text-sm text-slate-500 mt-1">追踪保证金变更历史，查看数据来源与操作链路</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">实体类型</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              <option value="">全部</option>
              <option value="margin">保证金</option>
              <option value="order">订单</option>
              <option value="rule">释放规则</option>
              <option value="import">导入记录</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">实体ID</label>
            <input
              type="text"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
              placeholder="输入实体ID"
              className="h-9 w-44 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Filter className="w-4 h-4" />
          <span>共 <strong className="text-slate-700">{total}</strong> 条审计记录</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">加载审计记录...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Clock className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm">暂无审计记录</p>
          <p className="text-xs mt-1">调整筛选条件后重试</p>
        </div>
      ) : (
        <div className="relative pl-2">
          <div className="absolute left-[5.85rem] top-0 bottom-0 w-0.5 bg-slate-200" />
          {logs.map(log => (
            <TimelineNode key={log.id} log={log} onTrace={handleTrace} />
          ))}
        </div>
      )}

      {traceLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-xl shadow-xl">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-600">加载链路追踪...</span>
          </div>
        </div>
      )}

      {traceData && !traceLoading && (
        <TracePanel data={traceData} onClose={() => setTraceData(null)} />
      )}
    </div>
  )
}
