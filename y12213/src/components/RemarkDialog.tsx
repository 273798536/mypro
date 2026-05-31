import { useState } from 'react'

interface RemarkDialogProps {
  open: boolean
  currentRemark: string
  warningId: string
  onSave: (remark: string, operator: string) => void
  onCancel: () => void
}

export default function RemarkDialog({ open, currentRemark, warningId, onSave, onCancel }: RemarkDialogProps) {
  const [remark, setRemark] = useState(currentRemark)
  const [operator, setOperator] = useState('演示用户')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[440px] shadow-xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">修改备注</h3>
        <p className="text-xs text-zinc-500 mb-3">预警ID: {warningId}</p>
        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">备注内容</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 resize-none"
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-zinc-500 mb-1">修改人</label>
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
            onClick={() => onSave(remark, operator)}
            className="px-4 py-1.5 text-sm text-zinc-100 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
