import type { ContaminationMark } from '../types'
import { AlertTriangle, ChevronDown, ChevronUp, Shield, ShieldCheck, ShieldX } from 'lucide-react'
import { useState } from 'react'

interface ContaminationBannerProps {
  mark: ContaminationMark
}

const statusConfig = {
  pending: { label: '待复核', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  passed: { label: '复核通过', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rejected: { label: '复核驳回', icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

export default function ContaminationBanner({ mark }: ContaminationBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const config = statusConfig[mark.reviewStatus]
  const StatusIcon = config.icon

  return (
    <div className={`rounded-xl border-2 border-red-200 bg-red-50/50 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-serif font-semibold text-red-800">污染样本标记</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-red-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-red-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-red-200 px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">污染来源</p>
            <p className="text-sm text-red-900">{mark.source}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 mb-1">详细描述</p>
            <p className="text-sm text-red-800">{mark.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-500">
            <span>检出时间：{mark.detectedAt}</span>
          </div>

          {mark.reviewRecord && (
            <div className={`mt-3 rounded-lg border p-4 ${config.bg} ${config.border}`}>
              <p className={`text-xs font-medium ${config.color} mb-2`}>复核记录</p>
              <div className="space-y-2 text-sm">
                <p>复核人：<strong>{mark.reviewRecord.reviewer}</strong></p>
                <p>复核时间：<span className="font-mono">{mark.reviewRecord.reviewedAt}</span></p>
                <p>复核决定：{mark.reviewRecord.decision === 'passed' ? '通过' : '驳回'}</p>
                <p>复核理由：{mark.reviewRecord.reason}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
