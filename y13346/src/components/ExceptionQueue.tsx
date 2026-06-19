import { useState } from 'react'
import { AlertOctagon, Hand, RefreshCw, Shield, Clock, User, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, riskLabel, statusLabel } from '../utils/format'
import type { ExceptionQueueItem } from '../types'
import clsx from 'clsx'

const typeLabel: Record<ExceptionQueueItem['type'], string> = {
  duplicate_evaluation: '重复评测挂起',
  risk_level_conflict: '风险等级冲突',
  manual_vs_prediction: '人工修正 vs 模型预测冲突',
  model_version_change: '模型版本变更导致旧人工判断需复查',
}

const typeIcon: Record<ExceptionQueueItem['type'], typeof AlertOctagon> = {
  duplicate_evaluation: RefreshCw,
  risk_level_conflict: AlertTriangle,
  manual_vs_prediction: Hand,
  model_version_change: Shield,
}

function ExceptionCard({ item }: { item: ExceptionQueueItem }) {
  const setSelectedRecordId = useAppStore((s) => s.setSelectedRecordId)
  const setSelectedTab = useAppStore((s) => s.setSelectedTab)
  const resolveException = useAppStore((s) => s.resolveException)
  const reviewRecords = useAppStore((s) => s.reviewRecords)
  const getBaselinePrediction = useAppStore((s) => s.getBaselinePrediction)
  const getCandidatePrediction = useAppStore((s) => s.getCandidatePrediction)
  const getManualCorrection = useAppStore((s) => s.getManualCorrection)

  const [showResolve, setShowResolve] = useState(false)
  const [resolutionNote, setResolutionNote] = useState('')
  const [operator, setOperator] = useState('算法值班人')

  const record = reviewRecords.find((r) => r.id === item.reviewRecordId)
  const baseline = getBaselinePrediction(item.reviewRecordId)
  const candidate = getCandidatePrediction(item.reviewRecordId)
  const manual = getManualCorrection(item.reviewRecordId)

  const Icon = typeIcon[item.type]
  const isResolved = item.status === 'resolved'

  const handleResolve = () => {
    if (!resolutionNote.trim()) {
      alert('请填写处理说明')
      return
    }
    resolveException({ exceptionId: item.id, resolutionNote: resolutionNote.trim(), operator })
    setShowResolve(false)
    setResolutionNote('')
  }

  return (
    <div className={clsx('card', isResolved && 'opacity-70')}>
      <div className="card-body">
        <div className="flex items-start gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            isResolved ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
          )}>
            {isResolved ? <CheckCircle2 size={20} /> : <Icon size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-900">{typeLabel[item.type]}</h3>
              <span className={clsx('badge', `risk-${item.severity}`)}>
                {riskLabel[item.severity]}
              </span>
              <span className={clsx(
                'badge',
                item.status === 'open' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                item.status === 'in_review' ? 'bg-sky-100 text-sky-700 border-sky-300' :
                'bg-emerald-100 text-emerald-700 border-emerald-300'
              )}>
                {item.status === 'open' ? '待处理' : item.status === 'in_review' ? '处理中' : '已解决'}
              </span>
            </div>
            <div className="text-sm text-slate-600 mt-1">{item.description}</div>
            <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> 上报于 {formatTime(item.reportedAt)}
              </span>
              {item.resolvedAt && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-500" /> 由 {item.resolvedBy} 于 {formatTime(item.resolvedAt)} 解决
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {baseline && (
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-[10px] uppercase text-slate-500 mb-1">基线预测</div>
                  <div className="flex flex-wrap gap-1">
                    <span className={clsx('badge', `risk-${baseline.predictedRiskLevel}`)}>
                      {riskLabel[baseline.predictedRiskLevel]}
                    </span>
                    <span className={clsx('badge', `status-${baseline.predictedStatus}`)}>
                      {statusLabel[baseline.predictedStatus]}
                    </span>
                  </div>
                </div>
              )}
              {candidate && (
                <div className="bg-brand-50 rounded p-2 border border-brand-100">
                  <div className="text-[10px] uppercase text-slate-500 mb-1">灰度预测</div>
                  <div className="flex flex-wrap gap-1">
                    <span className={clsx('badge', `risk-${candidate.predictedRiskLevel}`)}>
                      {riskLabel[candidate.predictedRiskLevel]}
                    </span>
                    <span className={clsx('badge', `status-${candidate.predictedStatus}`)}>
                      {statusLabel[candidate.predictedStatus]}
                    </span>
                    <span className="badge bg-white text-slate-600 border-slate-300">
                      {Math.round(candidate.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
              {manual && (
                <div className="bg-sky-50 rounded p-2 border border-sky-100">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 inline-flex items-center gap-1">
                    <Hand size={10} /> 人工修正（保留）
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className={clsx('badge', `risk-${manual.correctedRiskLevel}`)}>
                      {riskLabel[manual.correctedRiskLevel]}
                    </span>
                    <span className={clsx('badge', `status-${manual.correctedStatus}`)}>
                      {statusLabel[manual.correctedStatus]}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {manual.operator} · {formatTime(manual.correctedAt)}
                  </div>
                </div>
              )}
            </div>

            {item.resolutionNote && (
              <div className="mt-2 text-xs text-slate-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                <span className="font-medium">处理说明：</span>{item.resolutionNote}
              </div>
            )}

            {showResolve && !isResolved && (
              <div className="mt-3 space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1 flex items-center gap-1">
                    <User size={11} /> 操作人
                  </label>
                  <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">处理说明（必填，说明为何解除挂起 / 接受哪一方结果）</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="例如：经与风控运营老唐确认，灰度模型预测准确，采纳灰度结果，将风险升级为高…"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-secondary text-xs" onClick={() => setShowResolve(false)}>取消</button>
                  <button className="btn btn-primary text-xs" onClick={handleResolve}>
                    <CheckCircle2 size={12} /> 确认解决
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                className="btn btn-secondary text-xs"
                onClick={() => {
                  setSelectedRecordId(item.reviewRecordId)
                  setSelectedTab('detail')
                }}
              >
                查看材料 <ChevronRight size={12} />
              </button>
              {!isResolved && !showResolve && (
                <button className="btn btn-primary text-xs" onClick={() => setShowResolve(true)}>
                  算法值班人确认解决
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ExceptionQueue() {
  const exceptionQueue = useAppStore((s) => s.exceptionQueue)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_review' | 'resolved'>('all')

  const filtered = exceptionQueue
    .filter((e) => filter === 'all' || e.status === filter)
    .sort((a, b) => {
      const order = { open: 0, in_review: 1, resolved: 2 }
      return order[a.status] - order[b.status] || new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    })

  const counts = {
    all: exceptionQueue.length,
    open: exceptionQueue.filter((e) => e.status === 'open').length,
    in_review: exceptionQueue.filter((e) => e.status === 'in_review').length,
    resolved: exceptionQueue.filter((e) => e.status === 'resolved').length,
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <AlertOctagon size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-900">异常队列</h2>
          </div>
          <div className="text-xs text-slate-500">
            重复评测宁可挂起让算法值班人确认，也不给假稳定结论
          </div>
        </div>
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex gap-2 flex-wrap">
          {(['all', 'open', 'in_review', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-xs border transition-colors',
                filter === f
                  ? 'bg-brand-50 text-brand-700 border-brand-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {f === 'all' ? '全部' : f === 'open' ? '待处理' : f === 'in_review' ? '处理中' : '已解决'}
              <span className="ml-1.5 text-[10px] opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 text-xs text-slate-600 bg-amber-50/50 border-b border-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">风控运营老唐交接指引：</span>
              从异常队列可讲清每条记录的处理结果，点击「查看材料」能追溯到人工修正的原始说法与代码变更。
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((item) => (
          <ExceptionCard key={item.id} item={item} />
        ))}
        {!filtered.length && (
          <div className="card card-body text-center text-sm text-slate-500 py-8">
            🎉 当前没有异常项
          </div>
        )}
      </div>
    </div>
  )
}
