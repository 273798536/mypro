import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/hooks/useStore'

interface CreateCaseModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateCaseModal({ open, onClose, onSuccess }: CreateCaseModalProps) {
  const addNotification = useAppStore((s) => s.addNotification)
  const [customerName, setCustomerName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !totalAmount) return

    setLoading(true)
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, totalAmount: Number(totalAmount) }),
      })
      const json = await res.json()
      if (json.success) {
        addNotification('success', '案件创建成功')
        onSuccess()
        onClose()
        setCustomerName('')
        setTotalAmount('')
      } else {
        addNotification('error', json.error || '创建失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-border bg-charcoal p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-soft-white">创建退款案件</h2>
          <button onClick={onClose} className="text-soft-white/40 hover:text-soft-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-soft-white/70">客户姓名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
              placeholder="请输入客户姓名"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-soft-white/70">合同总金额 (元)</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="input-field"
              placeholder="请输入合同总金额"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              取消
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
