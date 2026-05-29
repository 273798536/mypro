import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Clock, CheckCircle, ShieldAlert, Plus, Search, Trash2, Eye, Calculator, FileUp, X } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useAppStore } from '@/hooks/useStore'
import CreateCaseModal from '@/components/CreateCaseModal'
import ImportModal from '@/components/ImportModal'
import StatusBadge from '@/components/StatusBadge'

interface CaseItem {
  id: string
  customer_name: string
  total_amount: number
  treatment_consumed: number
  platform_refund: number
  store_refund: number
  status: string
  created_at: string
  platform_name?: string
}

interface Stats {
  pendingCases: number
  pendingItems: number
  completedThisWeek: number
  interceptCount: number
}

export default function Workbench() {
  const addNotification = useAppStore((s) => s.addNotification)

  const [stats, setStats] = useState<Stats | null>(null)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [allCases, setAllCases] = useState<CaseItem[]>([])
  const [statusFilter, setStatusFilter] = useState('全部')
  const [searchName, setSearchName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importType, setImportType] = useState<'contract' | 'treatment' | 'coupon'>('contract')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats')
    const json = await res.json()
    if (json.success) setStats(json.data)
  }, [])

  const fetchCases = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== '全部') params.set('status', statusFilter)
    if (searchName) params.set('customerName', searchName)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    const res = await fetch(`/api/cases?${params}`)
    const json = await res.json()
    if (json.success) setCases(json.data)
    setLoading(false)
  }, [statusFilter, searchName, dateFrom, dateTo])

  const fetchAllCases = useCallback(async () => {
    const res = await fetch('/api/cases')
    const json = await res.json()
    if (json.success) setAllCases(json.data)
  }, [])

  useEffect(() => {
    fetchStats()
    fetchCases()
    fetchAllCases()
  }, [fetchStats, fetchCases, fetchAllCases])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      addNotification('success', '删除成功')
      setDeleteConfirm(null)
      fetchCases()
      fetchAllCases()
      fetchStats()
    } else {
      addNotification('error', '删除失败')
    }
  }

  const handleImport = (type: 'contract' | 'treatment' | 'coupon') => {
    if (!selectedCaseId && allCases.length > 0) {
      setSelectedCaseId(allCases[0].id)
    }
    setImportType(type)
    setImportModalOpen(true)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchCases()
    fetchAllCases()
  }

  const statCards = stats ? [
    { label: '待处理案件', value: stats.pendingCases, icon: Clock, color: 'text-warning-orange', bg: 'from-warning-orange/10 to-transparent' },
    { label: '待确认项', value: stats.pendingItems, icon: LayoutDashboard, color: 'text-medical-teal', bg: 'from-medical-teal/10 to-transparent' },
    { label: '本周完成', value: stats.completedThisWeek, icon: CheckCircle, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
    { label: '疗程拦截次数', value: stats.interceptCount, icon: ShieldAlert, color: 'text-red-400', bg: 'from-red-500/10 to-transparent' },
  ] : []

  const statusOptions = ['全部', '待拆账', '拆账中', '待确认', '已完成']

  return (
    <div className="min-h-screen bg-[#1A1A2E] p-6 text-soft-white">
      {/* Section A: Stats Overview */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">退款拆账工作台</h1>
          <button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 btn-primary">
            <Plus className="h-4 w-4" /> 新建案件
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <div key={i} className={cn('card bg-gradient-to-br', s.bg)}>
              <div className="flex items-center gap-3">
                <s.icon className={cn('h-6 w-6', s.color)} />
                <span className="text-sm text-soft-white/60">{s.label}</span>
              </div>
              <div className={cn('mt-3 stat-number', s.color)}>{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section B: Import Area */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <FileUp className="h-5 w-5 text-medical-teal" />
          数据导入
        </h2>
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-soft-white/60">选择案件：</label>
          <select
            value={selectedCaseId ?? ''}
            onChange={(e) => setSelectedCaseId(e.target.value || null)}
            className="input-field w-64"
          >
            <option value="">请选择案件</option>
            {allCases.map((c) => (
              <option key={c.id} value={c.id}>{c.customer_name} - {formatCurrency(c.total_amount)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['contract', 'treatment', 'coupon'] as const).map((type) => (
            <div key={type} className="card">
              <h3 className="mb-3 font-semibold text-soft-white">
                {type === 'contract' ? '分期合同' : type === 'treatment' ? '疗程记录' : '优惠券'}
              </h3>
              <button onClick={() => handleImport(type)} className="w-full btn-ghost">
                导入
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section C: Case List */}
      <section>
        <h2 className="mb-4 text-lg font-bold">退款案件列表</h2>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-charcoal-light p-0.5">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm transition',
                  statusFilter === s ? 'bg-medical-teal text-white' : 'text-soft-white/60 hover:text-soft-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft-white/40" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="input-field pl-9"
              placeholder="搜索客户姓名"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field w-36"
            placeholder="开始日期"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field w-36"
            placeholder="结束日期"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-charcoal-lighter">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-soft-white/60">客户姓名</th>
                <th className="px-4 py-3 text-right font-medium text-soft-white/60">总金额</th>
                <th className="px-4 py-3 text-right font-medium text-soft-white/60">疗程消耗</th>
                <th className="px-4 py-3 text-right font-medium text-soft-white/60">平台应退</th>
                <th className="px-4 py-3 text-right font-medium text-soft-white/60">门店应退</th>
                <th className="px-4 py-3 text-center font-medium text-soft-white/60">状态</th>
                <th className="px-4 py-3 text-center font-medium text-soft-white/60">创建时间</th>
                <th className="px-4 py-3 text-center font-medium text-soft-white/60">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-soft-white/40">加载中...</td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-soft-white/40">暂无数据</td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="border-t border-border transition hover:bg-charcoal-lighter/30">
                    <td className="px-4 py-3 font-medium text-soft-white">{c.customer_name}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.total_amount)}</td>
                    <td className={cn('px-4 py-3 text-right font-mono font-bold', c.treatment_consumed > 0 ? 'text-red-400' : 'text-soft-white/40')}>
                      {formatCurrency(c.treatment_consumed)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.platform_refund)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(c.store_refund)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-center text-soft-white/40">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {c.status === '待拆账' && (
                          <Link
                            to={`/refund/${c.id}`}
                            className="flex items-center gap-1 rounded-md bg-medical-teal/20 px-2 py-1 text-xs text-medical-teal hover:bg-medical-teal/30"
                          >
                            <Calculator className="h-3.5 w-3.5" /> 拆账
                          </Link>
                        )}
                        <Link
                          to={`/refund/${c.id}`}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-soft-white/60 hover:bg-charcoal-lighter"
                        >
                          <Eye className="h-3.5 w-3.5" /> 查看
                        </Link>
                        {deleteConfirm === c.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="rounded-md bg-red-500 px-2 py-1 text-xs text-white"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-md border border-border px-2 py-1 text-xs text-soft-white/60"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(c.id)}
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400/70 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateCaseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleRefresh}
      />
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        type={importType}
        refundCaseId={selectedCaseId}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
