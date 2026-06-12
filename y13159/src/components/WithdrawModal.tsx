import { useState } from 'react'
import { useStore } from '@/store'
import { X, AlertTriangle } from 'lucide-react'

export default function WithdrawModal({ onClose }: { onClose: () => void }) {
  const { addWithdrawRecord } = useStore()
  const [form, setForm] = useState({
    operator: '算法值班-当前用户',
    reason: '',
    supplementary_note: '',
    related_device: 'HP-003-A',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.reason.trim()) return
    addWithdrawRecord(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-industrial-900 border border-grid-line rounded-lg w-full max-w-lg shadow-2xl">
        <div className="px-5 py-4 border-b border-grid-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-500" />
            <h3 className="font-display font-bold text-white">补一条撤回记录</h3>
          </div>
          <button
            onClick={onClose}
            className="text-industrial-600 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-industrial-600 mb-1 uppercase tracking-wider">
              关联设备
            </label>
            <select
              value={form.related_device}
              onChange={(e) => setForm({ ...form, related_device: e.target.value })}
              className="w-full bg-industrial-800 border border-grid-line rounded px-3 py-2 text-sm text-white font-mono"
            >
              <option value="HP-003-A">HP-003-A</option>
              <option value="HP-003-B">HP-003-B</option>
              <option value="HP-003-C">HP-003-C</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-industrial-600 mb-1 uppercase tracking-wider">
              操作人
            </label>
            <input
              type="text"
              value={form.operator}
              onChange={(e) => setForm({ ...form, operator: e.target.value })}
              className="w-full bg-industrial-800 border border-grid-line rounded px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-industrial-600 mb-1 uppercase tracking-wider">
              撤回原因 *
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="例：HP-003-A 14:00时段 Pc 读数受电磁干扰..."
              className="w-full bg-industrial-800 border border-grid-line rounded px-3 py-2 text-sm text-white font-mono resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-industrial-600 mb-1 uppercase tracking-wider">
              后补说明
            </label>
            <textarea
              value={form.supplementary_note}
              onChange={(e) => setForm({ ...form, supplementary_note: e.target.value })}
              rows={3}
              placeholder="例：已与现场老唐确认..."
              className="w-full bg-industrial-800 border border-grid-line rounded px-3 py-2 text-sm text-white font-mono resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-industrial-800 text-industrial-600 rounded text-sm font-mono border border-industrial-700 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!form.reason.trim()}
              className="flex-1 px-4 py-2 bg-warning-500 text-industrial-900 rounded text-sm font-mono font-medium hover:bg-warning-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认撤回
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
