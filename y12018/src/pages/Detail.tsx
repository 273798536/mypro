import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Edit3,
  Package,
  FileText,
  CreditCard,
  History,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import type { DistributionDetail } from '../../shared/types'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<DistributionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.getDistributionDetail(id).then((res) => {
      setDetail(res)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400">加载中...</div>
    )
  }

  if (!detail) {
    return (
      <div className="p-8 text-center text-gray-400">未找到该记录</div>
    )
  }

  const { distribution, calculation_chain, deductions, batch, corrections } = detail

  const getBatchStatusText = (status: string) => {
    const map: Record<string, string> = {
      processing: '处理中',
      completed: '已完成',
      partial_failed: '部分失败',
    }
    return map[status] || status
  }

  const getBatchStatusColor = (status: string) => {
    const map: Record<string, string> = {
      processing: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      completed: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
      partial_failed: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    }
    return map[status] || ''
  }

  const getDeductionTypeText = (type: string) => {
    const map: Record<string, string> = {
      sponsor: '赞助扣款',
      penalty: '罚款',
      other: '其他',
    }
    return map[type] || type
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {distribution.player_name} - 第{distribution.rank}名
              {distribution.is_tied && (
                <span className="ml-2 text-sm text-amber-400 font-normal">(并列)</span>
              )}
            </h1>
            <p className="text-gray-400">
              发放批次: {batch.id} | 创建时间: {formatDate(distribution.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={distribution.status} />
            <Link
              to={`/correct/${id}`}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              修正
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-8 bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-lg">奖金计算链</h2>
            <span className="text-sm text-gray-400 ml-2">可追溯完整计算过程</span>
          </div>

          <div className="flex items-stretch gap-2 overflow-x-auto pb-4">
            {calculation_chain.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div
                  className={`flex-shrink-0 w-40 p-4 rounded-xl border ${
                    step.step === 5
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-[#0f0f1a] border-gray-700'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">步骤 {step.step}</div>
                  <div className="font-semibold text-sm mb-2">{step.label}</div>
                  <div
                    className={`font-mono font-bold ${
                      step.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {step.amount >= 0 ? '+' : ''}
                    {formatMoney(step.amount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 truncate" title={step.description}>
                    {step.description}
                  </div>
                </div>
                {index < calculation_chain.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-gray-600 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-lg">批次状态</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">批次 ID</div>
              <div className="font-mono">{batch.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">批次状态</div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg border text-sm ${getBatchStatusColor(
                  batch.status
                )}`}
              >
                {getBatchStatusText(batch.status)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-[#0f0f1a] rounded-lg p-3">
                <div className="text-lg font-bold">{batch.total_count}</div>
                <div className="text-xs text-gray-400">总计</div>
              </div>
              <div className="bg-[#0f0f1a] rounded-lg p-3">
                <div className="text-lg font-bold text-emerald-400">{batch.paid_count}</div>
                <div className="text-xs text-gray-400">成功</div>
              </div>
              <div className="bg-[#0f0f1a] rounded-lg p-3">
                <div className="text-lg font-bold text-red-400">{batch.failed_count}</div>
                <div className="text-xs text-gray-400">失败</div>
              </div>
            </div>
            {batch.completed_at && (
              <div>
                <div className="text-sm text-gray-400 mb-1">完成时间</div>
                <div className="text-sm">{formatDate(batch.completed_at)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-6 bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-red-400" />
            <h2 className="font-semibold text-lg">扣款明细</h2>
          </div>

          {deductions.length === 0 ? (
            <div className="text-gray-400 text-sm">无扣款记录</div>
          ) : (
            <div className="space-y-3">
              {deductions.map((ded) => (
                <div
                  key={ded.id}
                  className="flex items-center justify-between bg-[#0f0f1a] rounded-lg p-4"
                >
                  <div>
                    <div className="font-medium">{ded.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      类型: {getDeductionTypeText(ded.type)} | 来源: {ded.source}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-red-400">
                    -{formatMoney(ded.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-6 bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-lg">修正历史</h2>
          </div>

          {corrections.length === 0 ? (
            <div className="text-gray-400 text-sm">无修正记录</div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {corrections.map((corr) => (
                <div
                  key={corr.id}
                  className="bg-[#0f0f1a] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {corr.field === 'status' ? '状态' : corr.field === 'net_amount' ? '实发金额' : '银行卡'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(corr.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400 font-mono">{corr.old_value}</span>
                    <ArrowRight className="w-4 h-4 text-gray-500" />
                    <span className="text-emerald-400 font-mono">{corr.new_value}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    原因: {corr.reason} | 来源: {corr.source_note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold text-lg">来源与标记</h2>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">来源说明</div>
            <div className="bg-[#0f0f1a] rounded-lg p-3 text-sm">{distribution.source}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">标记状态</div>
            <div className="flex gap-3">
              <div className={`flex items-center gap-2 ${distribution.has_dispute ? 'text-amber-400' : 'text-gray-500'}`}>
                {distribution.has_dispute ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="text-sm">扣款争议</span>
              </div>
              <div className={`flex items-center gap-2 ${distribution.has_duplicate_resend ? 'text-blue-400' : 'text-gray-500'}`}>
                {distribution.has_duplicate_resend ? (
                  <History className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="text-sm">重发过</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">银行卡尾号</div>
            <div className="font-mono text-lg">**** {distribution.bank_card_last4}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
