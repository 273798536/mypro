import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Plus, Eye, Calendar, User, FileText, AlertTriangle, ChevronRight, X, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Expenditures() {
  const { expenditures, fetchExpenditures, createExpenditure, loading } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', amount: '', project_name: '', applicant: '', description: '' })

  useEffect(() => {
    fetchExpenditures()
  }, [fetchExpenditures])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createExpenditure({ ...form, amount: parseFloat(form.amount) })
    setShowModal(false)
    setForm({ title: '', amount: '', project_name: '', applicant: '', description: '' })
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'bg-slate-100 text-slate-700', text: '草稿' },
      pending_review: { color: 'bg-blue-100 text-blue-700', text: '待审核' },
      reviewing: { color: 'bg-amber-100 text-amber-700', text: '审核中' },
      approved: { color: 'bg-green-100 text-green-700', text: '已通过' },
      rejected: { color: 'bg-red-100 text-red-700', text: '已驳回' },
      delayed: { color: 'bg-orange-100 text-orange-700', text: '已延期' }
    }
    const style = map[status] || map.draft
    return <span className={`px-2 py-1 rounded text-xs font-medium ${style.color}`}>{style.text}</span>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  const formatMoney = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">支出申请</h1>
          <p className="text-slate-500 mt-1">管理社区基金支出申请项目</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          新建申请
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">项目名称</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">申请金额</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">申请人</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">状态</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">创建时间</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {expenditures.map((exp) => (
              <tr key={exp.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-slate-900">{exp.title}</p>
                    <p className="text-sm text-slate-500">{exp.project_name}</p>
                  </div>
                </td>
                <td className="py-4 px-4 font-medium text-slate-900">{formatMoney(exp.amount)}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <span className="text-slate-700">{exp.applicant}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {exp.status === 'delayed' && <AlertTriangle size={14} className="text-orange-500" />}
                    {getStatusBadge(exp.status)}
                  </div>
                </td>
                <td className="py-4 px-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {formatDate(exp.created_at)}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <Link
                    to={`/expenditures/${exp.id}`}
                    className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm"
                  >
                    <Eye size={14} />
                    详情
                    <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {expenditures.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <FileText size={40} className="mx-auto mb-2 opacity-50" />
                  <p>暂无支出申请</p>
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
              <h2 className="text-lg font-semibold text-slate-900">新建支出申请</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">申请标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">申请金额</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={form.applicant}
                    onChange={(e) => setForm({ ...form, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">所属项目</label>
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">申请说明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                />
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                >
                  <Check size={16} />
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
