import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { Plus, Eye, Clock, X, Check } from 'lucide-react'

export default function Disclosures() {
  const { disclosures, fetchDisclosures, expenditures, fetchExpenditures, createDisclosure, updateDisclosureStatus, loading } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ expenditure_id: '', disclosure_date: '', end_date: '', public_notice_content: '' })

  useEffect(() => {
    fetchDisclosures()
    fetchExpenditures()
  }, [fetchDisclosures, fetchExpenditures])

  const getExpenditureTitle = (id: string) => {
    return expenditures.find(e => e.id === id)?.title || '未知'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createDisclosure(form)
    setShowModal(false)
    setForm({ expenditure_id: '', disclosure_date: '', end_date: '', public_notice_content: '' })
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'bg-slate-100 text-slate-700', text: '草稿' },
      published: { color: 'bg-green-100 text-green-700', text: '公示中' },
      ended: { color: 'bg-blue-100 text-blue-700', text: '已结束' }
    }
    const style = map[status] || map.draft
    return <span className={`px-2 py-1 rounded text-xs font-medium ${style.color}`}>{style.text}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">公示管理</h1>
          <p className="text-slate-500 mt-1">社区基金支出公示发布与管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          新建公示
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {disclosures.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              {getStatusBadge(d.status)}
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Clock size={14} />
                {d.disclosure_date} ~ {d.end_date}
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{getExpenditureTitle(d.expenditure_id)}</h3>
            {d.public_notice_content && (
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">{d.public_notice_content}</p>
            )}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              {d.status === 'draft' && (
                <button
                  onClick={() => updateDisclosureStatus(d.id, 'published')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  <Eye size={14} />
                  发布
                </button>
              )}
              {d.status === 'published' && (
                <button
                  onClick={() => updateDisclosureStatus(d.id, 'ended')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700"
                >
                  <Check size={14} />
                  结束公示
                </button>
              )}
            </div>
          </div>
        ))}
        {disclosures.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Eye size={40} className="mx-auto mb-2 opacity-50" />
            <p>暂无公示记录</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">新建公示</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={form.disclosure_date}
                    onChange={(e) => setForm({ ...form, disclosure_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">公示内容</label>
                <textarea
                  value={form.public_notice_content}
                  onChange={(e) => setForm({ ...form, public_notice_content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="请输入公示说明内容..."
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
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
