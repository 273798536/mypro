import { ArrowLeft, Pause, AlertTriangle, GitBranch, Shield, CheckCircle2, XCircle, ChevronRight, Clock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatTime, riskLabel, statusLabel } from '../utils/format'
import SourceMaterialViewer from './SourceMaterialViewer'
import ManualCorrectionPanel from './ManualCorrectionPanel'
import clsx from 'clsx'

export default function RecordDetail() {
  const selectedRecordId = useAppStore((s) => s.selectedRecordId)
  const setSelectedRecordId = useAppStore((s) => s.setSelectedRecordId)
  const setSelectedTab = useAppStore((s) => s.setSelectedTab)
  const reviewRecords = useAppStore((s) => s.reviewRecords)
  const getBaselinePrediction = useAppStore((s) => s.getBaselinePrediction)
  const getCandidatePrediction = useAppStore((s) => s.getCandidatePrediction)
  const getManualCorrection = useAppStore((s) => s.getManualCorrection)
  const getExceptionFor = useAppStore((s) => s.getExceptionFor)

  const record = reviewRecords.find((r) => r.id === selectedRecordId)

  if (!selectedRecordId || !record) {
    return (
      <div className="card card-body text-center py-16">
        <div className="text-slate-400 mb-2">请从灰度对比图选择一条记录</div>
        <button className="btn btn-primary" onClick={() => setSelectedTab('chart')}>
          前往灰度对比图
        </button>
      </div>
    )
  }

  const baseline = getBaselinePrediction(selectedRecordId)
  const candidate = getCandidatePrediction(selectedRecordId)
  const manual = getManualCorrection(selectedRecordId)
  const exception = getExceptionFor(selectedRecordId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          className="btn btn-secondary text-xs"
          onClick={() => { setSelectedRecordId(null); setSelectedTab('chart') }}
        >
          <ArrowLeft size={14} /> 返回对比图
        </button>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>审查明细</span>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-900 truncate">{record.prTitle}</span>
        </div>
        <div className="flex-1" />
        {record.isSuspended && (
          <span className="badge bg-violet-100 text-violet-700 border-violet-300">
            <Pause size={11} className="mr-1" /> 已挂起：{record.suspendedReason}
          </span>
        )}
        <span className={clsx('badge', `risk-${record.currentRiskLevel}`)}>
          {riskLabel[record.currentRiskLevel]}
        </span>
        <span className={clsx('badge', `status-${record.currentStatus}`)}>
          {statusLabel[record.currentStatus]}
        </span>
      </div>

      {exception && (
        <div className="card !border-amber-300 bg-amber-50/50">
          <div className="card-body">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-900">
                  异常待处理：{exception.type === 'manual_vs_prediction' ? '人工修正与灰度预测冲突' : exception.type === 'duplicate_evaluation' ? '重复评测挂起' : exception.type}
                </div>
                <div className="text-sm text-amber-800 mt-1">{exception.description}</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-amber-700">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> 上报于 {formatTime(exception.reportedAt)}</span>
                  <span className="badge bg-white text-amber-700 border-amber-300">
                    {exception.status === 'open' ? '待处理' : exception.status === 'in_review' ? '处理中' : '已解决'}
                  </span>
                </div>
              </div>
              <button className="btn btn-primary text-xs" onClick={() => setSelectedTab('exceptions')}>
                前往异常队列处理
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SourceMaterialViewer recordId={selectedRecordId} />
          <ManualCorrectionPanel recordId={selectedRecordId} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-slate-900">PR 基本信息</h3>
            </div>
            <div className="card-body space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">仓库</span>
                <span className="font-mono text-slate-900">{record.repo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PR #</span>
                <span className="font-mono text-slate-900">{record.prId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">提交者</span>
                <span className="text-slate-900">{record.author}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">创建时间</span>
                <span className="text-slate-900">{formatTime(record.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">基线 vs 灰度预测</h3>
              </div>
            </div>
            <div className="card-body space-y-4">
              <div>
                <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-500" /> 基线模型预测
                </div>
                <div className="bg-slate-50 rounded-md p-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {baseline && (
                      <>
                        <span className={clsx('badge', `risk-${baseline.predictedRiskLevel}`)}>
                          {riskLabel[baseline.predictedRiskLevel]}
                        </span>
                        <span className={clsx('badge', `status-${baseline.predictedStatus}`)}>
                          {statusLabel[baseline.predictedStatus]}
                        </span>
                        <span className="badge bg-white text-slate-600 border-slate-300">
                          置信度 {Math.round((baseline?.confidence ?? 0) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{formatTime(baseline?.predictedAt ?? '')}</span>
                    <span className="font-mono">{baseline?.modelVersionId}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ChevronRight size={18} className="text-slate-300" />
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                  <GitBranch size={11} className="text-brand-500" /> 灰度模型预测
                </div>
                <div className="bg-brand-50/50 rounded-md p-3 space-y-2 border border-brand-100">
                  <div className="flex flex-wrap gap-1">
                    {candidate && (
                      <>
                        <span className={clsx('badge', `risk-${candidate.predictedRiskLevel}`)}>
                          {riskLabel[candidate.predictedRiskLevel]}
                        </span>
                        <span className={clsx('badge', `status-${candidate.predictedStatus}`)}>
                          {statusLabel[candidate.predictedStatus]}
                        </span>
                        <span className="badge bg-white text-slate-600 border-slate-300">
                          置信度 {Math.round((candidate?.confidence ?? 0) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{formatTime(candidate?.predictedAt ?? '')}</span>
                    <span className="font-mono">{candidate?.modelVersionId}</span>
                  </div>
                  {candidate && candidate.featureScores && (
                    <div className="pt-2 border-t border-brand-100 space-y-1">
                      <div className="text-[10px] uppercase text-slate-500 font-semibold">特征得分</div>
                      {Object.entries(candidate.featureScores).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-600 min-w-[120px] truncate">{k}</span>
                          <div className="flex-1 bg-slate-200/60 rounded-full h-1.5">
                            <div
                              className="bg-brand-500 h-1.5 rounded-full"
                              style={{ width: `${Math.round(v * 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600 w-10 text-right">
                            {Math.round(v * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {manual && (
                <>
                  <div className="flex justify-center">
                    <XCircle size={18} className="text-orange-300" />
                  </div>
                  <div className="rounded-md p-3 bg-orange-50 border border-orange-200">
                    <div className="text-xs font-medium text-orange-800 flex items-center gap-1">
                      <CheckCircle2 size={11} /> 人工修正结果（压过模型预测）
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={clsx('badge', `risk-${manual.correctedRiskLevel}`)}>
                        {riskLabel[manual.correctedRiskLevel]}
                      </span>
                      <span className={clsx('badge', `status-${manual.correctedStatus}`)}>
                        {statusLabel[manual.correctedStatus]}
                      </span>
                    </div>
                    <div className="text-[11px] text-orange-700 mt-1">
                      由 {manual.operator} 于 {formatTime(manual.correctedAt)} 修正
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
