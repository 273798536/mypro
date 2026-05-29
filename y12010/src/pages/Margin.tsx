import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import {
  Search,
  RotateCcw,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  X,
  Shield,
  FileText,
  Layers,
  AlertTriangle,
  Clock,
} from 'lucide-react'

type MarginStatus = 'locked' | 'pending_release' | 'released' | 'delayed_release'
type SourceType = 'manual' | 'import' | 'system'
type ReleaseType = 'deal' | 'cancel' | 'compliance'

interface MarginRecord {
  id: string
  enterpriseId: string
  enterpriseName: string
  batchId: string
  batchName: string
  amount: number
  status: MarginStatus
  lockTime: string
  releaseTime?: string
  source: SourceType
  remark?: string
}

interface CrossBatchGroup {
  batchId: string
  batchName: string
  status: string
  totalAmount: number
  records: MarginRecord[]
}

const statusConfig: Record<MarginStatus, { label: string; badgeClass: string }> = {
  locked: { label: '已锁定', badgeClass: 'badge badge-locked' },
  pending_release: { label: '待释放', badgeClass: 'badge badge-pending' },
  released: { label: '已释放', badgeClass: 'badge badge-released' },
  delayed_release: { label: '延迟释放', badgeClass: 'badge badge-delayed' },
}

const sourceConfig: Record<SourceType, { label: string; color: string; bg: string }> = {
  manual: { label: '手工录入', color: 'text-blue-700', bg: 'bg-blue-100' },
  import: { label: '文件导入', color: 'text-amber-700', bg: 'bg-amber-100' },
  system: { label: '系统自动', color: 'text-slate-600', bg: 'bg-slate-100' },
}

const releaseTypeConfig: Record<ReleaseType, { label: string; desc: string }> = {
  deal: { label: '成交释放', desc: '交易成交后自动释放保证金' },
  cancel: { label: '撤单释放', desc: '撤单释放将按T+N规则处理' },
  compliance: { label: '履约释放', desc: '履约到期后释放保证金' },
}

const defaultRules = [
  { name: '成交自动释放', type: 'deal', delayDays: 0, desc: '交易成交后立即释放保证金，无延迟' },
  { name: '撤单T+3释放', type: 'cancel', delayDays: 3, desc: '撤单后延迟3个工作日释放，防止异常撤单风险' },
  { name: '履约到期释放', type: 'compliance', delayDays: 0, desc: '履约期结束后立即释放保证金' },
]

function formatAmount(n: number | null | undefined) {
  if (n === null || n === undefined) return '¥0'
  return `¥${n.toLocaleString('zh-CN')}`
}

function formatTime(ts?: string) {
  if (!ts) return '-'
  return ts.slice(0, 16).replace('T', ' ')
}

function LockModal({
  enterprises,
  batches,
  onClose,
  onSuccess,
}: {
  enterprises: { id: string; name: string }[]
  batches: { id: string; name: string }[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [enterpriseId, setEnterpriseId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!enterpriseId || !batchId || !amount) return
    setSubmitting(true)
    try {
      await api.margin.lock({ enterpriseId, batchId, amount: Number(amount), remark })
      onSuccess()
      onClose()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-700 to-teal-600">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-white" />
            <h3 className="text-white font-display font-bold text-lg">锁定保证金</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">企业</label>
            <select
              value={enterpriseId}
              onChange={e => setEnterpriseId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              <option value="">选择企业</option>
              {enterprises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">批次</label>
            <select
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            >
              <option value="">选择批次</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">金额</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="输入锁定金额"
              className="h-9 w-full px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 font-mono-data placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">备注</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder="输入备注信息"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="h-9 px-4 text-sm text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !enterpriseId || !batchId || !amount}
            className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            确认锁定
          </button>
        </div>
      </div>
    </div>
  )
}

function ReleaseModal({
  record,
  onClose,
  onSuccess,
}: {
  record: MarginRecord
  onClose: () => void
  onSuccess: () => void
}) {
  const [releaseType, setReleaseType] = useState<ReleaseType>('deal')
  const [amount, setAmount] = useState(String(record.amount))
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.margin.release({ recordId: record.id, releaseType, amount: Number(amount), remark })
      onSuccess()
      onClose()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-700 to-teal-600">
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-white" />
            <h3 className="text-white font-display font-bold text-lg">释放保证金</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">企业</span>
              <span className="font-medium">{record.enterpriseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">批次</span>
              <span className="font-medium">{record.batchName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">锁定金额</span>
              <span className="font-mono-data font-medium">{formatAmount(record.amount)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">释放类型</label>
            <div className="space-y-2">
              {(Object.keys(releaseTypeConfig) as ReleaseType[]).map(type => (
                <label key={type} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-300 cursor-pointer transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/50">
                  <input
                    type="radio"
                    name="releaseType"
                    value={type}
                    checked={releaseType === type}
                    onChange={() => setReleaseType(type)}
                    className="mt-0.5 accent-teal-700"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">{releaseTypeConfig[type].label}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{releaseTypeConfig[type].desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {releaseType === 'cancel' && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-amber-700">撤单释放将按T+N规则处理</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">释放金额</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="h-9 w-full px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 font-mono-data placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">备注</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder="输入备注信息"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="h-9 px-4 text-sm text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !amount}
            className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            确认释放
          </button>
        </div>
      </div>
    </div>
  )
}

function CrossBatchPanel({
  enterpriseId,
  enterpriseName,
  onClose,
}: {
  enterpriseId: string
  enterpriseName: string
  onClose: () => void
}) {
  const [groups, setGroups] = useState<CrossBatchGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.margin.crossBatch(enterpriseId)
      .then(res => setGroups(res.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [enterpriseId])

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-96 bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-700 to-teal-600">
          <div>
            <h3 className="text-white font-display font-bold text-base">跨批次保证金视图</h3>
            <p className="text-teal-200 text-xs mt-0.5">{enterpriseName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">加载中...</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Layers className="w-10 h-10 mb-2 text-slate-300" />
              <p className="text-sm">暂无跨批次数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => {
                const totalStatus = statusConfig[group.status as MarginStatus]
                return (
                  <div key={group.batchId} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-semibold text-slate-700">{group.batchName}</span>
                        {totalStatus && <span className={totalStatus.badgeClass}>{totalStatus.label}</span>}
                      </div>
                      <span className="font-mono-data text-sm font-medium text-slate-800">{formatAmount(group.totalAmount)}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.records.map(rec => {
                        const cfg = statusConfig[rec.status]
                        return (
                          <div key={rec.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className={cfg?.badgeClass || 'badge'}>{cfg?.label || rec.status}</span>
                              <span className="text-slate-400">{formatTime(rec.lockTime)}</span>
                            </div>
                            <span className="font-mono-data font-medium text-slate-700">{formatAmount(rec.amount)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Margin() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<MarginRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filterEnterprise, setFilterEnterprise] = useState('')
  const [filterBatch, setFilterBatch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [enterprises, setEnterprises] = useState<{ id: string; name: string }[]>([])
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [showLockModal, setShowLockModal] = useState(false)
  const [releaseRecord, setReleaseRecord] = useState<MarginRecord | null>(null)
  const [crossBatchTarget, setCrossBatchTarget] = useState<{ id: string; name: string } | null>(null)
  const [rulesExpanded, setRulesExpanded] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (filterEnterprise) params.enterpriseId = filterEnterprise
      if (filterBatch) params.batchId = filterBatch
      if (filterStatus) params.status = filterStatus
      const res = await api.margin.list(params)
      const list = Array.isArray(res) ? res : []
      setRecords(list)
      const entMap = new Map<string, string>()
      const batMap = new Map<string, string>()
      list.forEach((r: MarginRecord) => {
        if (!entMap.has(r.enterpriseId)) entMap.set(r.enterpriseId, r.enterpriseName)
        if (!batMap.has(r.batchId)) batMap.set(r.batchId, r.batchName)
      })
      setEnterprises(Array.from(entMap, ([id, name]) => ({ id, name })))
      setBatches(Array.from(batMap, ([id, name]) => ({ id, name })))
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [filterEnterprise, filterBatch, filterStatus])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleReset = () => {
    setFilterEnterprise('')
    setFilterBatch('')
    setFilterStatus('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">保证金管理</h1>
          <p className="text-sm text-slate-500 mt-1">锁定、释放与跨批次流水管理</p>
        </div>
        <button
          onClick={() => setShowLockModal(true)}
          className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm"
        >
          <Lock className="w-4 h-4" />
          锁定保证金
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">企业</label>
            <select
              value={filterEnterprise}
              onChange={e => setFilterEnterprise(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 min-w-[140px]"
            >
              <option value="">全部企业</option>
              {enterprises.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">批次</label>
            <select
              value={filterBatch}
              onChange={e => setFilterBatch(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 min-w-[140px]"
            >
              <option value="">全部批次</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">状态</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 min-w-[120px]"
            >
              <option value="">全部状态</option>
              <option value="locked">已锁定</option>
              <option value="pending_release">待释放</option>
              <option value="released">已释放</option>
              <option value="delayed_release">延迟释放</option>
            </select>
          </div>
          <button
            onClick={() => fetchList()}
            className="h-9 px-5 flex items-center gap-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 active:bg-teal-900 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={handleReset}
            className="h-9 px-4 flex items-center gap-2 text-sm text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400">加载保证金记录...</span>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Shield className="w-12 h-12 mb-3 text-slate-300" />
            <p className="text-sm">暂无保证金记录</p>
            <p className="text-xs mt-1">点击"锁定保证金"开始添加</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">企业名称</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">批次名称</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">金额</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">锁定时间</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">释放时间</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">来源</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(rec => {
                  const statusCfg = statusConfig[rec.status]
                  const srcCfg = sourceConfig[rec.source]
                  const isDelayedCancel = rec.status === 'delayed_release'
                  return (
                    <tr key={rec.id} className={`hover:bg-slate-50/50 transition-colors ${isDelayedCancel ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setCrossBatchTarget({ id: rec.enterpriseId, name: rec.enterpriseName })}
                          className="text-teal-700 hover:text-teal-900 hover:underline font-medium text-sm"
                        >
                          {rec.enterpriseName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rec.batchName}</td>
                      <td className="px-4 py-3 text-right font-mono font-mono-data text-slate-800 font-medium">{formatAmount(rec.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={statusCfg.badgeClass}>{statusCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono-data text-xs">{formatTime(rec.lockTime)}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono-data text-xs">{formatTime(rec.releaseTime)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${srcCfg.bg} ${srcCfg.color}`}>
                          {srcCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(rec.status === 'pending_release' || rec.status === 'delayed_release') && (
                            <button
                              onClick={() => setReleaseRecord(rec)}
                              className="h-7 px-3 flex items-center gap-1 text-xs font-medium text-teal-700 border border-teal-300 rounded-md hover:bg-teal-50 transition-colors"
                            >
                              <Unlock className="w-3 h-3" />
                              释放
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/audit?entityType=margin&entityId=${rec.id}`)}
                            className="h-7 px-3 flex items-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            追溯
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setRulesExpanded(!rulesExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-sm text-slate-700">释放规则</span>
            <span className="text-[11px] text-slate-400">{defaultRules.length} 条规则</span>
          </div>
          {rulesExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        {rulesExpanded && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {defaultRules.map((rule, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-700">{rule.name}</span>
                  <span className="badge badge-locked">{releaseTypeConfig[rule.type as ReleaseType].label}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    延迟 <span className="font-mono-data font-medium text-slate-700">{rule.delayDays}</span> 天
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLockModal && (
        <LockModal
          enterprises={enterprises}
          batches={batches}
          onClose={() => setShowLockModal(false)}
          onSuccess={fetchList}
        />
      )}

      {releaseRecord && (
        <ReleaseModal
          record={releaseRecord}
          onClose={() => setReleaseRecord(null)}
          onSuccess={fetchList}
        />
      )}

      {crossBatchTarget && (
        <CrossBatchPanel
          enterpriseId={crossBatchTarget.id}
          enterpriseName={crossBatchTarget.name}
          onClose={() => setCrossBatchTarget(null)}
        />
      )}
    </div>
  )
}
