import { useState, useEffect, useCallback } from 'react'
import { Plus, FileInput, Eye } from 'lucide-react'
import { api } from '@/api'
import { useFilterStore } from '@/stores/filterStore'
import type { Transaction, DeductionDetail, MemberAccount, Package } from '@/types'
import DeductionDetailRow from '@/components/DeductionDetailRow'

const typeLabels: Record<Transaction['type'], string> = {
  consumption: '消费',
  recharge: '充值',
  refund: '退款',
}
const typeBadge: Record<Transaction['type'], string> = {
  consumption: 'badge-danger',
  recharge: 'badge-success',
  refund: 'badge-info',
}
const amountColor: Record<Transaction['type'], string> = {
  consumption: 'text-red-600',
  recharge: 'text-emerald-600',
  refund: 'text-blue-600',
}

type ModalType = 'none' | 'create' | 'backfill' | 'manualOverride'

export default function Transactions() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'deductions'>('transactions')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deductionDetails, setDeductionDetails] = useState<DeductionDetail[]>([])
  const [members, setMembers] = useState<MemberAccount[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)

  const [txTypeFilter, setTxTypeFilter] = useState('')
  const [backfillFilter, setBackfillFilter] = useState('')
  const [ddStatusFilter, setDdStatusFilter] = useState('')
  const [ddBackfillFilter, setDdBackfillFilter] = useState('')

  const [modal, setModal] = useState<ModalType>('none')
  const [selectedDetail, setSelectedDetail] = useState<DeductionDetail | null>(null)

  const [formMemberId, setFormMemberId] = useState('')
  const [formPetId, setFormPetId] = useState('')
  const [formPackageId, setFormPackageId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formType, setFormType] = useState<Transaction['type']>('consumption')
  const [formBackfillNote, setFormBackfillNote] = useState('')

  const [overrideStatus, setOverrideStatus] = useState<'duplicate' | 'expired' | 'normal'>('normal')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideBy, setOverrideBy] = useState('')

  const filters = useFilterStore((s) => s.getFilters)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const f: Record<string, string> = { ...filters() }
      if (txTypeFilter) f.type = txTypeFilter
      if (backfillFilter) f.isBackfilled = backfillFilter
      const list = await api.transactions.list(f)
      setTransactions(list)
    } finally {
      setLoading(false)
    }
  }, [filters, txTypeFilter, backfillFilter])

  const loadDeductionDetails = useCallback(async () => {
    setLoading(true)
    try {
      const f: Record<string, string> = { ...filters() }
      if (ddStatusFilter) f.status = ddStatusFilter
      if (ddBackfillFilter) f.backfillAffected = ddBackfillFilter
      const list = await api.deductionDetails.list(f)
      setDeductionDetails(list)
    } finally {
      setLoading(false)
    }
  }, [filters, ddStatusFilter, ddBackfillFilter])

  useEffect(() => {
    api.members.list().then(setMembers)
    api.packages.list().then(setPackages)
  }, [])

  useEffect(() => {
    if (activeTab === 'transactions') loadTransactions()
    else loadDeductionDetails()
  }, [activeTab, loadTransactions, loadDeductionDetails])

  const resetForm = () => {
    setFormMemberId('')
    setFormPetId('')
    setFormPackageId('')
    setFormAmount('')
    setFormType('consumption')
    setFormBackfillNote('')
  }

  const handleCreate = async () => {
    await api.transactions.create({
      member_id: formMemberId,
      pet_id: formPetId || undefined,
      package_id: formPackageId || undefined,
      amount: Number(formAmount),
      type: formType,
    })
    setModal('none')
    resetForm()
    loadTransactions()
  }

  const handleBackfill = async () => {
    await api.transactions.backfill({
      member_id: formMemberId,
      pet_id: formPetId || undefined,
      package_id: formPackageId || undefined,
      amount: Number(formAmount),
      type: formType,
      backfill_note: formBackfillNote,
    })
    setModal('none')
    resetForm()
    loadTransactions()
  }

  const handleManualOverride = async () => {
    if (!selectedDetail) return
    await api.deductionDetails.updateStatus(selectedDetail.id, {
      status: overrideStatus,
      overrideBy,
      reason: overrideReason,
    })
    setModal('none')
    setOverrideStatus('normal')
    setOverrideReason('')
    setOverrideBy('')
    setSelectedDetail(null)
    loadDeductionDetails()
  }

  const openManualOverride = (detail: DeductionDetail) => {
    setSelectedDetail(detail)
    setModal('manualOverride')
  }

  const filteredPackages = packages.filter((p) => p.member_id === formMemberId)

  const tabClass = (tab: 'transactions' | 'deductions') =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === tab
        ? 'bg-white text-teal-700 border border-slate-200 border-b-white -mb-px'
        : 'text-slate-500 hover:text-slate-700'
    }`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">消费流水与扣次明细</h2>
        {activeTab === 'transactions' && (
          <div className="flex gap-2">
            <button className="btn-primary btn-sm flex items-center gap-1" onClick={() => { resetForm(); setModal('create') }}>
              <Plus className="w-3.5 h-3.5" /> 录入消费
            </button>
            <button className="btn-secondary btn-sm flex items-center gap-1" onClick={() => { resetForm(); setModal('backfill') }}>
              <FileInput className="w-3.5 h-3.5" /> 补录流水
            </button>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button className={tabClass('transactions')} onClick={() => setActiveTab('transactions')}>消费流水</button>
        <button className={tabClass('deductions')} onClick={() => setActiveTab('deductions')}>扣次明细</button>
      </div>

      {activeTab === 'transactions' && (
        <div>
          <div className="filter-bar">
            <input type="date" className="filter-input" value={useFilterStore((s) => s.startDate)} onChange={(e) => useFilterStore.getState().setStartDate(e.target.value)} />
            <input type="date" className="filter-input" value={useFilterStore((s) => s.endDate)} onChange={(e) => useFilterStore.getState().setEndDate(e.target.value)} />
            <select className="filter-select" value={txTypeFilter} onChange={(e) => setTxTypeFilter(e.target.value)}>
              <option value="">全部类型</option>
              <option value="consumption">消费</option>
              <option value="recharge">充值</option>
              <option value="refund">退款</option>
            </select>
            <select className="filter-select" value={backfillFilter} onChange={(e) => setBackfillFilter(e.target.value)}>
              <option value="">补录: 全部</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>

          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">会员</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">宠物</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">套餐</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">补录标记</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">加载中…</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无数据</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="table-row-hover">
                      <td className="px-4 py-3 text-sm text-slate-500">{tx.created_at}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{tx.member_name || tx.member_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{tx.pet_name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{tx.package_name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={typeBadge[tx.type]}>{typeLabels[tx.type]}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${amountColor[tx.type]}`}>
                        ¥{tx.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tx.is_backfilled ? (
                          <span className="inline-flex flex-col gap-0.5">
                            <span className="badge-info">补录</span>
                            {tx.affected_detail_ids.length > 0 && (
                              <span className="text-xs text-blue-500">影响{tx.affected_detail_ids.length}条明细</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          className="btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => {
                            setActiveTab('deductions')
                            setDdBackfillFilter('')
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" /> 查看扣次
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

      {activeTab === 'deductions' && (
        <div>
          <div className="filter-bar">
            <select className="filter-select" value={ddStatusFilter} onChange={(e) => setDdStatusFilter(e.target.value)}>
              <option value="">全部状态</option>
              <option value="normal">正常</option>
              <option value="duplicate">重复扣次</option>
              <option value="expired">套餐过期</option>
              <option value="manual_override">人工修改</option>
            </select>
            <select className="filter-select" value={ddBackfillFilter} onChange={(e) => setDdBackfillFilter(e.target.value)}>
              <option value="">补录影响: 全部</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>

          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">套餐</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">扣次数量</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">剩余次数</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">人工修改标记</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">补录影响</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">创建时间</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">加载中…</td></tr>
                ) : deductionDetails.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">暂无数据</td></tr>
                ) : (
                  deductionDetails.map((d) => (
                    <DeductionDetailRow key={d.id} detail={d} onManualOverride={openManualOverride} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal('none')}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {modal === 'create' && <h3 className="text-lg font-semibold text-slate-800 mb-4">录入消费</h3>}
            {modal === 'backfill' && <h3 className="text-lg font-semibold text-slate-800 mb-4">补录流水</h3>}
            {modal === 'manualOverride' && <h3 className="text-lg font-semibold text-slate-800 mb-4">人工修改扣次状态</h3>}

            {(modal === 'create' || modal === 'backfill') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">会员</label>
                  <select className="filter-select w-full" value={formMemberId} onChange={(e) => setFormMemberId(e.target.value)}>
                    <option value="">请选择会员</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">宠物</label>
                  <select className="filter-select w-full" value={formPetId} onChange={(e) => setFormPetId(e.target.value)}>
                    <option value="">请选择宠物</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">套餐</label>
                  <select className="filter-select w-full" value={formPackageId} onChange={(e) => setFormPackageId(e.target.value)}>
                    <option value="">请选择套餐</option>
                    {filteredPackages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">金额</label>
                  <input type="number" className="filter-input w-full" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">类型</label>
                  <select className="filter-select w-full" value={formType} onChange={(e) => setFormType(e.target.value as Transaction['type'])}>
                    <option value="consumption">消费</option>
                    <option value="recharge">充值</option>
                    <option value="refund">退款</option>
                  </select>
                </div>
                {modal === 'backfill' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">补录说明</label>
                    <textarea className="filter-input w-full h-20 resize-none" value={formBackfillNote} onChange={(e) => setFormBackfillNote(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {modal === 'manualOverride' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">新状态</label>
                  <select className="filter-select w-full" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as 'duplicate' | 'expired' | 'normal')}>
                    <option value="normal">正常</option>
                    <option value="duplicate">重复扣次</option>
                    <option value="expired">套餐过期</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">修改原因</label>
                  <textarea className="filter-input w-full h-20 resize-none" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">操作人</label>
                  <input type="text" className="filter-input w-full" value={overrideBy} onChange={(e) => setOverrideBy(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal('none')}>取消</button>
              {modal === 'create' && <button className="btn-primary" onClick={handleCreate}>确认录入</button>}
              {modal === 'backfill' && <button className="btn-primary" onClick={handleBackfill}>确认补录</button>}
              {modal === 'manualOverride' && <button className="btn-primary" onClick={handleManualOverride}>确认修改</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
