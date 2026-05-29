import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import type { Distribution } from '../../shared/types'

type CorrectionField = 'net_amount' | 'status' | 'bank_card_last4'

export default function Correct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [distribution, setDistribution] = useState<Distribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [field, setField] = useState<CorrectionField>('status')
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [sourceNote, setSourceNote] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.getDistributionDetail(id).then((res) => {
      if (res) {
        setDistribution(res.distribution)
        setNewValue(String(res.distribution[field]))
      }
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (distribution) {
      setNewValue(String(distribution[field]))
    }
  }, [field, distribution])

  const handleFieldChange = (f: CorrectionField) => {
    setField(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !reason || !sourceNote) return

    setSubmitting(true)
    try {
      await api.correctDistribution(id, {
        field,
        new_value: newValue,
        reason,
        source_note: sourceNote,
      })
      navigate(`/detail/${id}`)
    } catch (err) {
      alert('修正失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>
  }

  if (!distribution) {
    return <div className="p-8 text-center text-gray-400">未找到该记录</div>
  }

  const getOldValueDisplay = () => {
    switch (field) {
      case 'net_amount':
        return formatMoney(distribution.net_amount)
      case 'status':
        return <StatusBadge status={distribution.status} />
      case 'bank_card_last4':
        return `**** ${distribution.bank_card_last4}`
    }
  }

  const getNewValueDisplay = () => {
    switch (field) {
      case 'net_amount':
        const num = parseFloat(newValue) || 0
        return formatMoney(num)
      case 'status':
        return <StatusBadge status={newValue as any} />
      case 'bank_card_last4':
        return `**** ${newValue}`
    }
  }

  const hasChanges = String(distribution[field]) !== newValue

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Link
          to={`/detail/${id}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回详情
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">修正发放记录</h1>
        <p className="text-gray-400">
          {distribution.player_name} - 第{distribution.rank}名
          {distribution.is_tied && ' (并列)'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">选择修正字段</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleFieldChange('status')}
              className={`px-6 py-3 rounded-lg border transition-colors ${
                field === 'status'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#0f0f1a] border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              发放状态
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('net_amount')}
              className={`px-6 py-3 rounded-lg border transition-colors ${
                field === 'net_amount'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#0f0f1a] border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              税后实发金额
            </button>
            <button
              type="button"
              onClick={() => handleFieldChange('bank_card_last4')}
              className={`px-6 py-3 rounded-lg border transition-colors ${
                field === 'bank_card_last4'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#0f0f1a] border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              银行卡尾号
            </button>
          </div>
        </div>

        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">修正前后对比</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <div className="text-sm text-red-400 mb-3 font-medium">修正前</div>
              <div className="text-2xl font-bold">{getOldValueDisplay()}</div>
            </div>
            <div
              className={`rounded-xl p-6 border ${
                hasChanges
                  ? 'bg-emerald-900/20 border-emerald-500/30'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className={`text-sm mb-3 font-medium ${hasChanges ? 'text-emerald-400' : 'text-gray-400'}`}>
                修正后 {hasChanges && '(已变更)'}
              </div>
              <div className="text-2xl font-bold">{getNewValueDisplay()}</div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm text-gray-400 mb-2">
              输入新值
            </label>
            {field === 'status' ? (
              <select
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
              >
                <option value="pending">待发放</option>
                <option value="paid">已发放</option>
                <option value="failed">发放失败</option>
                <option value="disputed">有争议</option>
              </select>
            ) : field === 'net_amount' ? (
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="输入金额"
              />
            ) : (
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                maxLength={4}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="银行卡尾号4位"
              />
            )}
          </div>
        </div>

        <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            修正原因与来源说明 <span className="text-red-400">*</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">修正原因</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 min-h-[80px]"
                placeholder="例如：银行卡号更正后重发成功"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">来源说明</label>
              <input
                type="text"
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
                placeholder="例如：银行回执#2026-0589"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>修正操作将被记录到历史，不可撤销</span>
          </div>
          <div className="flex gap-4">
            <Link
              to={`/detail/${id}`}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={submitting || !hasChanges || !reason || !sourceNote}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              {submitting ? '提交中...' : '确认修正'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
