import { useState } from 'react'
import { X, FileUp } from 'lucide-react'
import { useAppStore } from '@/hooks/useStore'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  type: 'contract' | 'treatment' | 'coupon'
  refundCaseId: string | null
  onSuccess: () => void
}

const typeConfig = {
  contract: {
    title: '导入分期合同',
    endpoint: '/api/contracts',
    dataKey: 'contracts',
    placeholder: `[\n  {\n    "platformName": "分期平台名称",\n    "contractAmount": 50000,\n    "paidAmount": 20000,\n    "platformFee": 1500,\n    "platformStatus": "未结清"\n  }\n]`,
  },
  treatment: {
    title: '导入疗程记录',
    endpoint: '/api/treatments',
    dataKey: 'treatments',
    placeholder: `[\n  {\n    "treatmentName": "热玛吉",\n    "sessionCount": 6,\n    "completedSessions": 3,\n    "unitPrice": 2000\n  }\n]`,
  },
  coupon: {
    title: '导入优惠券',
    endpoint: '/api/coupons',
    dataKey: 'coupons',
    placeholder: `[\n  {\n    "couponName": "新人优惠券",\n    "couponAmount": 500,\n    "isRecoverable": true\n  }\n]`,
  },
}

export default function ImportModal({ open, onClose, type, refundCaseId, onSuccess }: ImportModalProps) {
  const addNotification = useAppStore((s) => s.addNotification)
  const [jsonText, setJsonText] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const config = typeConfig[type]

  const handleImport = async () => {
    if (!refundCaseId) {
      addNotification('warning', '请先选择案件')
      return
    }
    if (!jsonText.trim()) {
      addNotification('warning', '请输入JSON数据')
      return
    }

    let data
    try {
      data = JSON.parse(jsonText)
    } catch (e) {
      addNotification('error', 'JSON格式错误')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refundCaseId, [config.dataKey]: data }),
      })
      const json = await res.json()
      if (json.success) {
        addNotification('success', `成功导入 ${json.data?.count ?? 0} 条记录`)
        onSuccess()
        onClose()
        setJsonText('')
      } else {
          addNotification('error', json.error || '导入失败')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-border bg-charcoal p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-soft-white">
            <FileUp className="h-5 w-5 text-medical-teal" />
            {config.title}
          </h2>
          <button onClick={onClose} className="text-soft-white/40 hover:text-soft-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-soft-white/60">粘贴JSON数据</label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="input-field h-48 font-mono text-xs"
              placeholder={config.placeholder}
              spellCheck={false}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">
              取消
            </button>
            <button onClick={handleImport} disabled={loading} className="btn-primary">
              {loading ? '导入中...' : '导入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
