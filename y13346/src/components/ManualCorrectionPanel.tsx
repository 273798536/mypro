import { useState } from 'react'
import { Hand, StickyNote, Clock, User, Save, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, riskLabel, statusLabel } from '../utils/format'
import type { RiskLevel, ReviewStatus } from '../types'
import clsx from 'clsx'

interface Props {
  recordId: string
}

export default function ManualCorrectionPanel({ recordId }: Props) {
  const getManualCorrection = useAppStore((s) => s.getManualCorrection)
  const applyManualCorrection = useAppStore((s) => s.applyManualCorrection)
  const getBaselinePrediction = useAppStore((s) => s.getBaselinePrediction)
  const getCandidatePrediction = useAppStore((s) => s.getCandidatePrediction)

  const existing = getManualCorrection(recordId)
  const baseline = getBaselinePrediction(recordId)
  const candidate = getCandidatePrediction(recordId)

  const [riskLevel, setRiskLevel] = useState<RiskLevel>(existing?.correctedRiskLevel ?? candidate?.predictedRiskLevel ?? 'low')
  const [status, setStatus] = useState<ReviewStatus>(existing?.correctedStatus ?? candidate?.predictedStatus ?? 'approved')
  const [reason, setReason] = useState(existing?.reason ?? '')
  const [followUpNote, setFollowUpNote] = useState(existing?.followUpNote ?? '')
  const [operator, setOperator] = useState(existing?.operator ?? '老唐（风控运营）')

  const hasConflict = existing && candidate && (
    existing.correctedRiskLevel !== candidate.predictedRiskLevel ||
    existing.correctedStatus !== candidate.predictedStatus
  )

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('请填写人工修正原因')
      return
    }
    applyManualCorrection({
      recordId,
      correctedRiskLevel: riskLevel,
      correctedStatus: status,
      reason: reason.trim(),
      followUpNote: followUpNote.trim() || undefined,
      operator,
      operatorRole: 'risk_ops',
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Hand size={16} className="text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-900">人工修正记录</h3>
          {existing && (
            <span className="badge bg-sky-50 text-sky-700 border-sky-300">已存在修正</span>
          )}
        </div>
        {existing && (
          <div className="text-xs text-slate-500">
            人工修正不会被模型结果覆盖
          </div>
        )}
      </div>

      {existing && (
        <div className="px-4 pt-4">
          <div className={clsx(
            'rounded-md p-3 text-sm border',
            hasConflict ? 'bg-orange-50 border-orange-200' : 'bg-sky-50 border-sky-200'
          )}>
            {hasConflict ? (
              <div className="flex items-start gap-2 text-orange-800">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">当前灰度模型预测与人工修正存在冲突</div>
                  <div className="text-xs mt-1 opacity-80">
                    模型预测：
                    <span className={clsx('badge mx-1', `risk-${candidate?.predictedRiskLevel}`)}>
                      {candidate ? riskLabel[candidate.predictedRiskLevel] : '-'}
                    </span>
                    <span className={clsx('badge mx-1', `status-${candidate?.predictedStatus}`)}>
                      {candidate ? statusLabel[candidate.predictedStatus] : '-'}
                    </span>
                    ，人工修正将继续保留并优先展示，不会被模型覆盖。
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sky-800">
                <Hand size={16} />
                上次人工修正结果将持续保留，即使模型版本更新也不会被自动覆盖。
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card-body space-y-4">
        {existing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={11} /> 修正时间
              </div>
              <div className="text-sm text-slate-900 mt-0.5">{formatTime(existing.correctedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <User size={11} /> 操作人
              </div>
              <div className="text-sm text-slate-900 mt-0.5">{existing.operator}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">修正风险等级</div>
              <div className="mt-0.5">
                <span className={clsx('badge', `risk-${existing.correctedRiskLevel}`)}>
                  {riskLabel[existing.correctedRiskLevel]}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">修正状态</div>
              <div className="mt-0.5">
                <span className={clsx('badge', `status-${existing.correctedStatus}`)}>
                  {statusLabel[existing.correctedStatus]}
                </span>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-slate-500">修正原因</div>
              <div className="text-sm text-slate-700 mt-0.5">{existing.reason}</div>
            </div>
            {existing.followUpNote && (
              <div className="md:col-span-2">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <StickyNote size={11} /> 后补备注
                </div>
                <div className="text-sm text-slate-700 mt-0.5 bg-amber-50 border border-amber-200 rounded p-2">
                  {existing.followUpNote}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-900">
            {existing ? '更新人工修正' : '提交人工修正（风控运营）'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">操作人</label>
              <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">修正风险等级</label>
              <select className="select" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}>
                <option value="low">{riskLabel.low}</option>
                <option value="medium">{riskLabel.medium}</option>
                <option value="high">{riskLabel.high}</option>
                <option value="critical">{riskLabel.critical}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">修正状态</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value as ReviewStatus)}>
                <option value="approved">{statusLabel.approved}</option>
                <option value="pending">{statusLabel.pending}</option>
                <option value="rejected">{statusLabel.rejected}</option>
                <option value="corrected">{statusLabel.corrected}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">修正原因（必填）</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="请填写人工修正原因，说明为什么不采纳模型预测结果"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1 flex items-center gap-1">
              <StickyNote size={11} /> 后补备注（可选，供复盘时补充说明）
            </label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="例如：变更待研发确认后，将补充风险评估细节…"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button className="btn btn-primary" onClick={handleSubmit}>
              <Save size={14} /> 保存人工修正
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
