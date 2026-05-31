import { useState } from 'react'

interface QuotaDialogProps {
  open: boolean
  contractNo: string
  currentAmount: number
  totalAmount: number
  onUpdate: (newAmount: number, reason: string, operator: string) => void
  onCancel: () => void
}

export default function QuotaDialog({ open, contractNo, currentAmount, totalAmount, onUpdate, onCancel }: QuotaDialogProps) {
  const [amount, setAmount] = useState(currentAmount)
  const [reason, setReason] = useState('')
  const [operator, setOperator] = useState('演示用户')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-base font-semibold text-zinc-100 mb-2">修改额度占用</h3>
        <p className="text-xs text-zinc-500 mb-4">合同编号: {contractNo} | 总额度: {totalAmount.toLocaleString()}</p>
        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">新额度占用</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={0}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">修改原因</label>
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
            onClick={() => onUpdate(amount, reason, operator)}
            className="px-4 py-1.5 text-sm text-zinc-100 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors font-medium"
          >
            确认修改
          </button>
        </div>
      </div>
    </div>
  )
}
