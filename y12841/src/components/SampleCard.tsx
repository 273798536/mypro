import type { Sample } from '../types'
import { CheckCircle, AlertTriangle, XCircle, FlaskConical } from 'lucide-react'

const categoryConfig = {
  normal: { label: '正常样本', icon: CheckCircle, borderClass: 'border-emerald-300', bgClass: 'bg-emerald-50/50', badge: 'badge-normal' },
  boundary: { label: '边界样本', icon: AlertTriangle, borderClass: 'border-amber-300', bgClass: 'bg-amber-50/50', badge: 'badge-boundary' },
  bad: { label: '坏样本', icon: XCircle, borderClass: 'border-red-300', bgClass: 'bg-red-50/50', badge: 'badge-bad' },
}

interface SampleCardProps {
  sample: Sample
  isSelected: boolean
  onClick: () => void
}

export default function SampleCard({ sample, isSelected, onClick }: SampleCardProps) {
  const config = categoryConfig[sample.category]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`card-lift w-full text-left rounded-xl border-2 p-4 transition-all ${
        isSelected
          ? `${config.borderClass} ${config.bgClass} shadow-md ring-2 ring-offset-1 ring-teal-950/20`
          : `border-slate-200 bg-white hover:${config.borderClass}`
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${sample.category === 'normal' ? 'text-emerald-600' : sample.category === 'boundary' ? 'text-amber-600' : 'text-red-600'}`} />
          <span className="font-mono text-sm font-semibold text-slate-800">{sample.code}</span>
        </div>
        <span className={config.badge}>{config.label}</span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <FlaskConical className="h-3 w-3" />
          {sample.source}
        </div>

        {sample.reagentBatch ? (
          <div className="text-xs text-slate-500">
            试剂批号：<span className="font-mono text-slate-700">{sample.reagentBatch}</span>
          </div>
        ) : (
          <div className="missing-tag">
            试剂批号未录入
          </div>
        )}

        {sample.oldRemark && (
          <p className="old-remark">旧备注：{sample.oldRemark}</p>
        )}

        {sample.contaminationMark && (
          <div className="badge-contamination mt-1">
            污染标记 · {sample.contaminationMark.reviewStatus === 'pending' ? '待复核' : sample.contaminationMark.reviewStatus === 'passed' ? '复核通过' : '复核驳回'}
          </div>
        )}

        {sample.missingTimestamp && (
          <div className="missing-tag mt-1" title={sample.missingTimestampSource || ''}>
            时间点缺失
          </div>
        )}
      </div>
    </button>
  )
}
