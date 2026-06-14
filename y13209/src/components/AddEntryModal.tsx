import { useState, useCallback } from 'react'
import { useStore } from '@/store'
import { Plus, X, Clock, Trash2 } from 'lucide-react'
import type { TimecodeEntry } from '@/types'

export default function AddEntryModal({ onClose }: { onClose: () => void }) {
  const { addEntry } = useStore()

  const [projectName, setProjectName] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [splitRatio, setSplitRatio] = useState('')
  const [authStart, setAuthStart] = useState('')
  const [authEnd, setAuthEnd] = useState('')

  const handleSubmit = useCallback(() => {
    if (!projectName || !timeStart || !timeEnd || !splitRatio || !authStart || !authEnd) return

    const endDate = new Date(authEnd)
    const today = new Date()
    const diffDays = (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    let authStatus: TimecodeEntry['authorization']['status'] = 'valid'
    if (diffDays < 0) authStatus = 'expired'
    else if (diffDays <= 7) authStatus = 'expiring'

    addEntry({
      projectName,
      timeRange: { start: timeStart, end: timeEnd },
      splitRatio,
      authorization: {
        startDate: authStart,
        endDate: authEnd,
        status: authStatus,
      },
      remarks: [],
      screenshots: [],
      alignmentStatus: authStatus === 'valid' ? 'aligned' : 'misaligned',
      reviewStatus: 'unreviewed',
    })
    onClose()
  }, [projectName, timeStart, timeEnd, splitRatio, authStart, authEnd, addEntry, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#16162a] rounded-2xl border border-[#2a2a4a] w-[480px] max-w-[90vw] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a4a]">
          <h2 className="text-sm font-semibold text-gray-200">新增时码条目</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#2a2a4a] text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">项目名称</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="如：星河录音棚 A棚"
              className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50 placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">开始时间</label>
              <input
                type="datetime-local"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">结束时间</label>
              <input
                type="datetime-local"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">分账比例</label>
            <input
              type="text"
              value={splitRatio}
              onChange={(e) => setSplitRatio(e.target.value)}
              placeholder="如：甲方60% / 乙方40%"
              className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50 placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">授权起始</label>
              <input
                type="date"
                value={authStart}
                onChange={(e) => setAuthStart(e.target.value)}
                className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">授权到期</label>
              <input
                type="date"
                value={authEnd}
                onChange={(e) => setAuthEnd(e.target.value)}
                className="w-full bg-[#0d0d1a] text-gray-200 text-sm rounded-lg px-3 py-2 border border-[#2a2a4a] focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a4a] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-[#2a2a4a] transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!projectName || !timeStart || !timeEnd || !splitRatio || !authStart || !authEnd}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-[#1a1a2e] hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}
