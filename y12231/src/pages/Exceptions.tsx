import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, Shield, Search } from 'lucide-react'
import { api } from '@/api'
import { useFilterStore } from '@/stores/filterStore'
import type { ExceptionItem } from '@/types'

const TYPE_LABELS: Record<ExceptionItem['type'], string> = {
  ownership_change: '换主人',
  package_expired: '套餐过期',
  duplicate_deduction: '重复扣次',
  backfill_impact: '补录影响',
  amount_anomaly: '金额异常',
}

const TYPE_COLORS: Record<ExceptionItem['type'], string> = {
  ownership_change: 'bg-purple-50 text-purple-700 border-purple-200',
  package_expired: 'bg-orange-50 text-orange-700 border-orange-200',
  duplicate_deduction: 'bg-rose-50 text-rose-700 border-rose-200',
  backfill_impact: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  amount_anomaly: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
}

const STATUS_LABELS: Record<ExceptionItem['status'], string> = {
  pending: '待处理',
  confirmed: '已确认',
  rejected: '已驳回',
  resolved: '已解决',
}

const STATUS_BADGES: Record<ExceptionItem['status'], string> = {
  pending: 'badge-warning',
  confirmed: 'badge-success',
  rejected: 'badge-danger',
  resolved: 'badge-info',
}

type TabType = 'pending' | 'all'

interface HandleModalData {
  id: string
  action: 'confirm' | 'reject' | 'resolve'
}

export default function Exceptions() {
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<HandleModalData | null>(null)
  const [operator, setOperator] = useState('')
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { exceptionStatus, setExceptionStatus } = useFilterStore()

  const fetchExceptions = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (activeTab === 'pending') {
        filters.status = 'pending'
      } else {
        if (typeFilter) filters.type = typeFilter
        if (severityFilter) filters.severity = severityFilter
        if (statusFilter) filters.status = statusFilter
      }
      const list = await api.exceptions.list(filters)
      setExceptions(list)
    } catch {
      setExceptions([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, typeFilter, severityFilter, statusFilter])

  useEffect(() => {
    fetchExceptions()
  }, [fetchExceptions])

  useEffect(() => {
    if (exceptionStatus && activeTab === 'all') {
      setStatusFilter(exceptionStatus)
      setExceptionStatus('')
    }
  }, [exceptionStatus, activeTab, setExceptionStatus])

  const pendingCount = exceptions.filter(e => e.status === 'pending').length
  const allCount = exceptions.length

  const openModal = (id: string, action: 'confirm' | 'reject' | 'resolve') => {
    setModalData({ id, action })
    setOperator('')
    setResolution('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalData(null)
    setOperator('')
    setResolution('')
  }

  const handleSubmit = async () => {
    if (!modalData || !operator.trim()) return
    setSubmitting(true)
    try {
      const statusMap: Record<string, string> = {
        confirm: 'confirmed',
        reject: 'rejected',
        resolve: 'resolved',
      }
      await api.exceptions.handle(modalData.id, {
        status: statusMap[modalData.action],
        resolvedBy: operator.trim(),
        resolution: resolution.trim() || undefined,
      })
      closeModal()
      fetchExceptions()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const renderTypeBadge = (type: ExceptionItem['type']) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  )

  const renderSeverityBadge = (severity: ExceptionItem['severity']) => (
    <span className={severity === 'warning' ? 'badge-warning' : 'badge-danger'}>
      {severity === 'warning' ? '警告' : '严重'}
    </span>
  )

  const renderStatusBadge = (status: ExceptionItem['status']) => (
    <span className={STATUS_BADGES[status]}>
      {STATUS_LABELS[status]}
    </span>
  )

  const formatTime = (t: string) => {
    const d = new Date(t)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const renderPendingCards = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Clock className="w-5 h-5 mr-2 animate-spin" />
          加载中...
        </div>
      )
    }
    if (exceptions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CheckCircle className="w-12 h-12 mb-3 text-emerald-300" />
          <p className="text-sm">暂无待确认项目</p>
        </div>
      )
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {exceptions.map(item => (
          <div
            key={item.id}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {renderTypeBadge(item.type)}
                {renderSeverityBadge(item.severity)}
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">{item.description}</p>
            <div className="space-y-1 mb-3">
              {item.related_member_name && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">会员：</span>
                  {item.related_member_name}
                </p>
              )}
              {item.related_pet_name && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">宠物：</span>
                  {item.related_pet_name}
                </p>
              )}
              {item.related_transaction_id && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">交易ID：</span>
                  <span className="font-mono">{item.related_transaction_id.slice(0, 8)}</span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-amber-200">
              <span className="text-xs text-slate-400">
                {formatTime(item.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn-primary btn-sm"
                  onClick={() => openModal(item.id, 'confirm')}
                >
                  确认
                </button>
                <button
                  className="btn-danger btn-sm"
                  onClick={() => openModal(item.id, 'reject')}
                >
                  驳回
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderAllTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Clock className="w-5 h-5 mr-2 animate-spin" />
          加载中...
        </div>
      )
    }
    if (exceptions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Search className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm">暂无匹配的异常记录</p>
        </div>
      )
    }
    return (
      <div className="table-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-medium text-slate-600">类型</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">严重度</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">描述</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">关联会员</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">关联宠物</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">状态</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">创建时间</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map(item => (
              <tr key={item.id} className="border-b border-slate-50 table-row-hover">
                <td className="px-4 py-3">{renderTypeBadge(item.type)}</td>
                <td className="px-4 py-3">{renderSeverityBadge(item.severity)}</td>
                <td className="px-4 py-3 max-w-xs truncate text-slate-700" title={item.description}>
                  {item.description}
                </td>
                <td className="px-4 py-3 text-slate-600">{item.related_member_name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{item.related_pet_name || '-'}</td>
                <td className="px-4 py-3">{renderStatusBadge(item.status)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatTime(item.created_at)}</td>
                <td className="px-4 py-3">
                  {item.status === 'pending' ? (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => openModal(item.id, 'resolve')}
                    >
                      处理
                    </button>
                  ) : (
                    item.resolution && (
                      <div className="text-xs text-slate-500 max-w-[180px]">
                        <p className="truncate" title={item.resolution}>{item.resolution}</p>
                        {item.resolved_by && (
                          <p className="text-slate-400 mt-0.5">处理人: {item.resolved_by}</p>
                        )}
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderModal = () => {
    if (!modalOpen || !modalData) return null
    const actionLabels: Record<string, string> = {
      confirm: '确认',
      reject: '驳回',
      resolve: '解决',
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-teal-700" />
            <h3 className="text-lg font-semibold text-slate-800">
              {actionLabels[modalData.action]}异常
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">操作</label>
              <select
                className="filter-select w-full"
                value={modalData.action}
                onChange={e => setModalData({ ...modalData, action: e.target.value as HandleModalData['action'] })}
              >
                <option value="confirm">确认</option>
                <option value="reject">驳回</option>
                <option value="resolve">解决</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">处理人</label>
              <input
                type="text"
                className="filter-input w-full"
                placeholder="请输入处理人姓名"
                value={operator}
                onChange={e => setOperator(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">处理意见</label>
              <textarea
                className="filter-input w-full h-24 resize-none"
                placeholder="请输入处理意见"
                value={resolution}
                onChange={e => setResolution(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button className="btn-secondary" onClick={closeModal}>取消</button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!operator.trim() || submitting}
            >
              {submitting ? '提交中...' : '提交'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">待确认与异常清单</h1>
        {pendingCount > 0 && (
          <span className="badge-warning flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {pendingCount} 待处理
          </span>
        )}
        {allCount > 0 && (
          <span className="badge-info flex items-center gap-1">
            {exceptions.length} 总计
          </span>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          待确认
          {pendingCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-amber-100 text-amber-700">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-teal-700 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('all')}
        >
          异常清单
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="filter-bar">
          <select
            className="filter-select"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">全部类型</option>
            <option value="ownership_change">换主人</option>
            <option value="package_expired">套餐过期</option>
            <option value="duplicate_deduction">重复扣次</option>
            <option value="backfill_impact">补录影响</option>
            <option value="amount_anomaly">金额异常</option>
          </select>
          <select
            className="filter-select"
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="">全部严重度</option>
            <option value="warning">警告</option>
            <option value="critical">严重</option>
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="confirmed">已确认</option>
            <option value="rejected">已驳回</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
      )}

      {activeTab === 'pending' ? renderPendingCards() : renderAllTable()}

      {renderModal()}
    </div>
  )
}
