import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api'
import {
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Link2,
  Shield,
  FileText,
  Unlock,
  ArrowRight,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react'

type OrderStatus = 'pending' | 'dealt' | 'cancelled' | 'complying' | 'complied' | 'overdue'
type OrderType = 'bid' | 'ask'

interface Order {
  id: string
  enterpriseId: string
  enterpriseName: string
  batchId: string
  batchName: string
  type: OrderType
  quantity: number
  price: number
  status: OrderStatus
  splitFrom: string | null
  splitIndex: number | null
  dealTime: string | null
  cancelTime: string | null
  complianceDeadline: string | null
  complianceTime: string | null
  marginRecordId: string | null
  createdAt: string
}

interface OverdueOrder extends Order {
  overdueDays: number
}

interface SplitData {
  parentOrder: Order
  splits: Order[]
  totalSplitQty: number
  parentQty: number
}

interface TraceMargin {
  id: string
  amount: number
  status: string
  enterpriseName: string
  lockTime: string
}

interface TraceOrder {
  id: string
  status: string
  quantity: number
  price: number
  type: OrderType
}

interface TraceReleaseRule {
  id: string
  name: string
  type: string
  delayDays: number
  description: string
}

interface AuditEntry {
  id: string
  operation: string
  operator: string
  timestamp: string
  label: string
}

interface TraceData {
  order: TraceOrder
  margin: TraceMargin | null
  releaseRule: TraceReleaseRule | null
  auditTrail: AuditEntry[]
}

const statusLabel: Record<OrderStatus, string> = {
  pending: '待成交',
  dealt: '已成交',
  cancelled: '已撤单',
  complying: '履约中',
  complied: '已履约',
  overdue: '已逾期',
}

const statusBadge: Record<OrderStatus, string> = {
  pending: 'badge badge-pending-order',
  dealt: 'badge badge-dealt',
  cancelled: 'badge badge-cancelled',
  complying: 'badge badge-complying',
  complied: 'badge badge-complied',
  overdue: 'badge badge-overdue',
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function formatAmount(v: number | null | undefined) {
  if (v === null || v === undefined) return '¥0'
  return '¥' + v.toLocaleString('zh-CN')
}

function formatTime(ts: string | null) {
  if (!ts) return '-'
  return ts.slice(0, 16).replace('T', ' ')
}

function TraceModal({ data, onClose }: { data: TraceData; onClose: () => void }) {
  const marginNode = data.margin
  const ruleNode = data.releaseRule

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-700 to-teal-600">
          <div>
            <h3 className="text-white font-display font-bold text-lg">链路追踪</h3>
            <p className="text-teal-200 text-xs mt-0.5">订单 · {data.order.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-center gap-0 overflow-x-auto pb-4">
            <div className="flex-shrink-0 w-52">
              <div className="p-4 rounded-xl border-2 border-teal-300 bg-teal-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-teal-600 text-white">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-800">保证金锁定</span>
                </div>
                {marginNode ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">金额</span>
                      <span className="font-mono-data text-slate-700 font-medium">{formatAmount(marginNode.amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">锁定时间</span>
                      <span className="font-mono-data text-slate-700">{formatTime(marginNode.lockTime)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">来源</span>
                      <span className="font-mono-data text-teal-700">{marginNode.enterpriseName}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">暂无数据</p>
                )}
              </div>
            </div>
            <div className="flex items-center h-16 px-2 flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-shrink-0 w-52">
              <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm text-slate-800">订单状态</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">类型</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${data.order.type === 'bid' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {data.order.type === 'bid' ? '买入' : '卖出'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">数量</span>
                    <span className="font-mono-data text-slate-700">{data.order.quantity}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">当前状态</span>
                    <span className={statusBadge[data.order.status as OrderStatus] ?? 'badge'}>
                      {statusLabel[data.order.status as OrderStatus] ?? data.order.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center h-16 px-2 flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-shrink-0 w-52">
              {ruleNode ? (
                <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-800">释放规则</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">规则名</span>
                      <span className="font-mono-data text-slate-700">{ruleNode.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">延迟天数</span>
                      <span className="font-mono-data text-slate-700">{ruleNode.delayDays}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-slate-400 text-white">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-slate-400">释放规则</span>
                  </div>
                  <p className="text-[11px] text-slate-400">暂无释放规则</p>
                </div>
              )}
            </div>
          </div>

          {data.auditTrail && data.auditTrail.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                审计轨迹摘要
              </h4>
              <div className="space-y-2">
                {data.auditTrail.slice(0, 3).map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <span className="font-medium text-slate-700">{entry.label || entry.operation}</span>
                    <span className="text-slate-400">{entry.operator}</span>
                    <span className="font-mono-data text-slate-400 ml-auto">{formatTime(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'all' | 'overdue'>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [enterpriseFilter, setEnterpriseFilter] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [overdueOrders, setOverdueOrders] = useState<OverdueOrder[]>([])
  const [overdueCount, setOverdueCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [splitData, setSplitData] = useState<SplitData | null>(null)
  const [splitLoading, setSplitLoading] = useState(false)
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [traceLoading, setTraceLoading] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (enterpriseFilter) params.enterpriseId = enterpriseFilter
      const res = await api.orders.list(Object.keys(params).length ? params : undefined)
      setOrders(Array.isArray(res) ? res : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, enterpriseFilter])

  const fetchOverdue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.orders.overdue()
      const list = Array.isArray(res) ? res : []
      setOverdueOrders(list)
      setOverdueCount(list.length)
    } catch {
      setOverdueOrders([])
      setOverdueCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverdue()
  }, [fetchOverdue])

  useEffect(() => {
    if (activeTab === 'all') {
      fetchOrders()
    } else {
      fetchOverdue()
    }
  }, [activeTab, fetchOrders, fetchOverdue])

  const handleSearch = () => {
    if (activeTab === 'all') fetchOrders()
    else fetchOverdue()
  }

  const handleReset = () => {
    setStatusFilter('')
    setEnterpriseFilter('')
  }

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setSplitData(null)
      return
    }
    setExpandedId(id)
    setSplitLoading(true)
    try {
      const res = await api.orders.splits(id)
      setSplitData(res)
    } catch {
      setSplitData(null)
    } finally {
      setSplitLoading(false)
    }
  }

  const handleTrace = async (id: string) => {
    setTraceLoading(true)
    try {
      const res = await api.orders.trace(id)
      setTraceData(res)
    } catch {
      setTraceData(null)
    } finally {
      setTraceLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">交易订单管理</h1>
        <p className="text-sm text-slate-500 mt-1">碳配额交易订单与履约跟踪</p>
      </div>

      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          全部订单
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'overdue'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          履约逾期
          {overdueCount > 0 && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              <option value="">全部</option>
              <option value="pending">待成交</option>
              <option value="dealt">已成交</option>
              <option value="cancelled">已撤单</option>
              <option value="complying">履约中</option>
              <option value="complied">已履约</option>
              <option value="overdue">已逾期</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">企业</label>
            <input
              type="text"
              value={enterpriseFilter}
              onChange={e => setEnterpriseFilter(e.target.value)}
              placeholder="输入企业名称或ID"
              className="h-9 w-52 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={handleReset}
            className="h-9 px-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        </div>
      </div>

      {activeTab === 'all' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium">订单ID</th>
                  <th className="px-5 py-3 font-medium">企业名称</th>
                  <th className="px-5 py-3 font-medium">类型</th>
                  <th className="px-5 py-3 font-medium text-right">数量</th>
                  <th className="px-5 py-3 font-medium text-right">单价</th>
                  <th className="px-5 py-3 font-medium text-right">金额</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">成交时间</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">加载订单...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <AlertCircle className="w-10 h-10 text-slate-300" />
                        <p className="text-sm">暂无订单数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      expanded={expandedId === order.id}
                      splitData={expandedId === order.id ? splitData : null}
                      splitLoading={expandedId === order.id && splitLoading}
                      onExpand={() => handleExpand(order.id)}
                      onTrace={() => handleTrace(order.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 font-medium">企业名称</th>
                  <th className="px-5 py-3 font-medium">订单ID</th>
                  <th className="px-5 py-3 font-medium">履约截止日</th>
                  <th className="px-5 py-3 font-medium text-right">逾期天数</th>
                  <th className="px-5 py-3 font-medium text-right">保证金金额</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-slate-400">加载逾期订单...</span>
                      </div>
                    </td>
                  </tr>
                ) : overdueOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <AlertCircle className="w-10 h-10 text-slate-300" />
                        <p className="text-sm">暂无逾期订单</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  overdueOrders.map(o => (
                    <tr key={o.id} className={`hover:bg-slate-50 transition-colors ${o.overdueDays > 30 ? 'bg-red-50' : ''}`}>
                      <td className="px-5 py-3 text-slate-700">{o.enterpriseName || '-'}</td>
                      <td className="px-5 py-3 font-mono-data text-slate-700">{shortId(o.id)}</td>
                      <td className="px-5 py-3 text-slate-500">{formatTime(o.complianceDeadline)}</td>
                      <td className="px-5 py-3 text-right font-mono-data font-bold text-red-600">{o.overdueDays}</td>
                      <td className="px-5 py-3 text-right font-mono-data text-slate-800">{formatAmount(o.quantity * o.price)}</td>
                      <td className="px-5 py-3">
                        <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
                          复核
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
        <TraceModal data={traceData} onClose={() => setTraceData(null)} />
      )}
    </div>
  )
}

function OrderRow({
  order,
  expanded,
  splitData,
  splitLoading,
  onExpand,
  onTrace,
}: {
  order: Order
  expanded: boolean
  splitData: SplitData | null
  splitLoading: boolean
  onExpand: () => void
  onTrace: () => void
}) {
  const amount = order.quantity * order.price

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${order.splitFrom ? 'pl-6' : ''}`}>
        <td className="px-5 py-3">
          <div className={order.splitFrom ? 'pl-6' : ''}>
            <span className="font-mono-data text-slate-700">{shortId(order.id)}</span>
            {order.splitFrom && (
              <p className="text-slate-400 text-xs mt-0.5">拆分自 #{shortId(order.splitFrom)}</p>
            )}
          </div>
        </td>
        <td className="px-5 py-3 text-slate-700">{order.enterpriseName || '-'}</td>
        <td className="px-5 py-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${order.type === 'bid' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {order.type === 'bid' ? '买入' : '卖出'}
          </span>
        </td>
        <td className="px-5 py-3 text-right font-mono-data text-slate-800">{order.quantity}</td>
        <td className="px-5 py-3 text-right font-mono-data text-slate-800">{formatAmount(order.price)}</td>
        <td className="px-5 py-3 text-right font-mono-data text-slate-800">{formatAmount(amount)}</td>
        <td className="px-5 py-3">
          <span className={statusBadge[order.status] ?? 'badge'}>{statusLabel[order.status] ?? order.status}</span>
        </td>
        <td className="px-5 py-3 text-slate-500">{formatTime(order.dealTime)}</td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onTrace}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              追溯
            </button>
            <button
              onClick={onExpand}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              展开
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} className="px-5 py-0">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-3">
              {splitLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : splitData ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    拆分详情
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <p className="text-[11px] text-slate-400 mb-1">父订单</p>
                      <p className="font-mono-data text-sm text-slate-700">{shortId(splitData.parentOrder.id)}</p>
                      <p className="text-xs text-slate-500 mt-1">数量：{splitData.parentQty} · 企业：{splitData.parentOrder.enterpriseName || '-'}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <p className="text-[11px] text-slate-400 mb-1">拆分汇总</p>
                      <p className="text-sm text-slate-700">共 {splitData.splits.length} 笔拆分</p>
                      <p className="text-xs text-slate-500 mt-1">拆分总量：{splitData.totalSplitQty} / 原始量：{splitData.parentQty}</p>
                    </div>
                  </div>
                  {splitData.splits.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200">
                          <th className="py-2 text-left font-medium">拆分ID</th>
                          <th className="py-2 text-left font-medium">企业</th>
                          <th className="py-2 text-right font-medium">数量</th>
                          <th className="py-2 text-left font-medium">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {splitData.splits.map((s, i) => (
                          <tr key={s.id}>
                            <td className="py-2 font-mono-data text-slate-700">#{i + 1} {shortId(s.id)}</td>
                            <td className="py-2 text-slate-600">{s.enterpriseName || '-'}</td>
                            <td className="py-2 text-right font-mono-data text-slate-700">{s.quantity}</td>
                            <td className="py-2">
                              <span className={statusBadge[s.status as OrderStatus] ?? 'badge'}>
                                {statusLabel[s.status as OrderStatus] ?? s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">暂无拆分数据</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
