import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, X } from 'lucide-react'
import { useBatchStore } from '@/stores/batchStore'
import StatusBadge from '@/components/StatusBadge'

export default function BatchList() {
  const navigate = useNavigate()
  const { batches, fetchBatches, createBatch, loading } = useBatchStore()
  const [modelNo, setModelNo] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ modelNo: '', windTunnelNo: '', testDate: '' })

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const handleSearch = () => {
    fetchBatches({ modelNo, status, startDate, endDate })
  }

  const handleCreate = async () => {
    if (!form.modelNo || !form.windTunnelNo || !form.testDate) return
    await createBatch(form)
    setShowModal(false)
    setForm({ modelNo: '', windTunnelNo: '', testDate: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap bg-slate-800 rounded-lg p-4 border border-slate-700">
        <input
          type="text"
          placeholder="模型编号"
          value={modelNo}
          onChange={(e) => setModelNo(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-40"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
        >
          <option value="">全部状态</option>
          <option value="pending_review">待复核</option>
          <option value="anomaly">异常</option>
          <option value="completed">已完成</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
        />
        <span className="text-slate-500 text-sm">至</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={handleSearch}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-1.5 rounded-md text-sm transition-colors"
        >
          <Search size={14} />
          搜索
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-1.5 rounded-md text-sm transition-colors"
        >
          <Plus size={14} />
          新增批次
        </button>
      </div>

      {loading && <div className="text-slate-400 text-sm">加载中...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            onClick={() => navigate(`/batch/${batch.id}`)}
            className="bg-slate-800 border border-slate-700 rounded-lg p-5 cursor-pointer hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-slate-100 font-medium">{batch.modelNo}</div>
                <div className="text-slate-400 text-sm mt-0.5 font-mono">{batch.batchNo}</div>
              </div>
              <StatusBadge status={batch.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{batch.testDate}</span>
              {(batch.anomalyCount ?? 0) > 0 && (
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                  {batch.anomalyCount} 条异常
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!loading && batches.length === 0 && (
        <div className="text-center text-slate-500 py-12">暂无试验批次</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-100">新增试验批次</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">模型编号</label>
                <input
                  type="text"
                  value={form.modelNo}
                  onChange={(e) => setForm((f) => ({ ...f, modelNo: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="如 CAR-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">风洞编号</label>
                <input
                  type="text"
                  value={form.windTunnelNo}
                  onChange={(e) => setForm((f) => ({ ...f, windTunnelNo: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="如 WT-01"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">试验日期</label>
                <input
                  type="date"
                  value={form.testDate}
                  onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-md text-sm text-slate-300 border border-slate-600 hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 rounded-md text-sm font-medium bg-amber-500 hover:bg-amber-600 text-slate-900 transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
