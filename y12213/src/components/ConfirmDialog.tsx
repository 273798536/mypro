import { useState } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: (operator: string) => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [operator, setOperator] = useState('演示用户')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4">{message}</p>
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
            onClick={() => onConfirm(operator)}
            className="px-4 py-1.5 text-sm text-zinc-100 bg-red-600 rounded hover:bg-red-700 transition-colors font-medium"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
