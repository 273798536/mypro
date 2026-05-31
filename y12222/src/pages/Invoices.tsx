import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Plus, AlertTriangle, Check, X, Calendar, Building2 } from 'lucide-react'

export default function Invoices() {
  const { invoices, fetchInvoices, createInvoice, confirmDuplicate, verifyInvoice, expenditures, fetchExpenditures, loading } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ invoice_number: '', amount: '', vendor: '', invoice_date: '', expenditure_id: '' })
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchInvoices()
    fetchExpenditures()
  }, [fetchInvoices, fetchExpenditures])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createInvoice({ ...form, amount: parseFloat(form.amount) })
    setShowModal(false)
    setForm({ invoice_number: '', amount: '', vendor: '', invoice_date: '', expenditure_id: '' })
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true
    if (filter === 'duplicate') return inv.is_duplicate || inv.duplicate_status !== 'none'
    if (filter === 'pending') return inv.verification_status === 'pending'
    return true
  })

  const formatMoney = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  const formatDate = (date: string) => new Date(date).toLocaleDateString('zh-CN')

  const getDuplicateBadge = (status: string) => {
    if (status === 'none') return null
    const map: Record<string, { color: string; text: string }> = {
      suspected: { color: 'bg-yellow-100 text-yellow-700', text: '疑似重复' },
      confirmed: { color: 'bg-red-100 text-red-700', text: '确认为重复' },
      dismissed: { color: 'bg-slate-100 text-slate-600', text: '已排除' }
    }
    const style = map[status]
    return <span className={`px-2 py-1 rounded text-xs font-medium ${style.color}`}>{style.text}</span>
  }

  const getVerifyBadge = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-slate-100 text-slate-600', text: '待校验' },
      verified: { color: 'bg-green-100 text-green-700', text: '校验通过' },
      failed: { color: 'bg-red-100 text-red-700', text: '校验失败' }
    }
    const style = map[status] || map.pending
    return <span className={`px-2 py-1 rounded text-xs font-medium ${style.color}`}>{style.text}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">发票管理</h1>
          <p className="text-slate-500 mt-1">管理和校验发票记录，自动检测重复发票</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          录入发票
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'duplicate', label: '重复发票' },
          { key: 'pending', label: '待校验' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">发票号</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">开票方</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">金额</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">日期</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">重复状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">校验状态</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className={`border-b border-slate-100 ${inv.is_duplicate ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {inv.is_duplicate && <AlertTriangle size={14} className="text-red-500" />}
                    <span className="font-medium text-slate-900">{inv.invoice_number}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    <span className="text-slate-700">{inv.vendor}</span>
                  </div>
                </td>
                <td className="py-4 px-4 font-medium text-slate-900">{formatMoney(inv.amount)}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={14} />
                    {formatDate(inv.invoice_date)}
                  </div>
                </td>
                <td className="py-4 px-4">{getDuplicateBadge(inv.duplicate_status)}</td>
                <td className="py-4 px-4">{getVerifyBadge(inv.verification_status)}</td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {inv.duplicate_status === 'suspected' && (
                      <>
                        <button
                          onClick={() => confirmDuplicate(inv.id, 'confirmed', inv.duplicate_of || undefined)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="确认为重复"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={() => confirmDuplicate(inv.id, 'dismissed')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="排除重复嫌疑"
                        >
                          <Check size={16} />
                        </button>
                      </>
                    )}
                    {inv.verification_status === 'pending' && (
                      <button
                        onClick={() => verifyInvoice(inv.id, 'verified')}
                        className="text-sm text-teal-600 hover:text-teal-700"
                      >
                        标记通过
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  暂无发票记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">录入发票</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">发票号</label>
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">金额</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">开票方</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开票日期</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">关联支出</label>
                  <select
                    value={form.expenditure_id}
                    onChange={(e) => setForm({ ...form, expenditure_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  >
                    <option value="">请选择...</option>
                    {expenditures.map((e) => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  录入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
