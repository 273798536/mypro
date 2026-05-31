import { useState } from 'react'

interface ExtendDialogProps {
  open: boolean
  contractNo: string
  onExtend: (extendDays: number, reason: string, operator: string) => void
  onCancel: () => void
}

export default function ExtendDialog({ open, contractNo, onExtend, onCancel }: ExtendDialogProps) {
  const [days, setDays] = useState(30)
  const [reason, setReason] = useState('')
  const [operator, setOperator] = useState('演示用户')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">合同延期</h3>
        <p className="text-xs text-zinc-500 mb-4">合同编号: {contractNo}</p>
        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">延期天数</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            min={1}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">延期原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-zinc-500 mb-1">操作人</label>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onExtend(days, reason, operator)}
            className="px-4 py-1.5 text-sm text-zinc-100 bg-orange-600 rounded hover:bg-orange-700 transition-colors font-medium"
          >
            确认延期
          </button>
        </div>
      </div>
    </div>
  )
}
