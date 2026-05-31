import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import ExceptionCard from '@/components/ExceptionCard'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Exception {
  id: string
  type: string
  country: string
  period: string
  reference_id: string
  reference_type: string
  description: string
  impact: number
  status: string
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

const TYPE_TABS = [
  { key: '', label: '全部' },
  { key: 'cross_period_rate', label: '税率跨期' },
  { key: 'late_return', label: '退货晚到' },
  { key: 'country_mismatch', label: '国家错配' },
]

export default function Exceptions() {
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [activeType, setActiveType] = useState('')
  const [showAll, setShowAll] = useState(true)
  const [actionModal, setActionModal] = useState<{ id: string; action: 'confirm' | 'reject' } | null>(null)
  const [processing, setProcessing] = useState(false)
  const api = useApi()

  const fetchExceptions = useCallback(() => {
    const params = new URLSearchParams()
    if (activeType) params.set('type', activeType)
    if (!showAll) params.set('status', 'pending')
    api.get<{ success: boolean; data: Exception[] }>(`/api/exceptions?${params}`).then((res) => setExceptions(res.data)).catch(() => setExceptions([]))
  }, [activeType, showAll])

  useEffect(() => {
    fetchExceptions()
  }, [fetchExceptions])

  const handleAction = async (resolution: string) => {
    if (!actionModal) return
    setProcessing(true)
    try {
      await api.put(`/api/exceptions/${actionModal.id}`, {
        action: actionModal.action,
        resolution,
      })
      fetchExceptions()
    } finally {
      setProcessing(false)
      setActionModal(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-navy-500">异常处理</h1>
        <button onClick={fetchExceptions} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              activeType === tab.key
                ? 'bg-navy-500 text-white font-medium'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowAll(!showAll)}
          className={`ml-4 px-4 py-1.5 text-sm rounded-lg transition-colors ${
            showAll
              ? 'bg-gray-100 text-gray-700 font-medium'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}
        >
          {showAll ? '显示全部' : '仅待处理'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exceptions.map((ex) => (
          <ExceptionCard
            key={ex.id}
            exception={ex}
            onConfirm={(id) => setActionModal({ id, action: 'confirm' })}
            onReject={(id) => setActionModal({ id, action: 'reject' })}
          />
        ))}
      </div>

      {exceptions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400">暂无异常记录</p>
        </div>
      )}

      <ConfirmDialog
        open={actionModal !== null}
        onClose={() => setActionModal(null)}
        onConfirm={handleAction}
        title={actionModal?.action === 'confirm' ? '确认异常' : '驳回异常'}
        description={
          actionModal?.action === 'confirm'
            ? '确认此异常处理？请填写处理说明。'
            : '确认驳回此异常？请填写驳回原因。'
        }
        confirmLabel={actionModal?.action === 'confirm' ? '确认' : '驳回'}
        loading={processing}
      />
    </div>
  )
}
