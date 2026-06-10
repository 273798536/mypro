import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useOffTargetStore } from '@/store/offTargetStore'
import {
  ArrowLeft, AlertTriangle, CheckCircle, Clock, ChevronRight,
  User, Calendar, MessageSquare, Edit3, Shield
} from 'lucide-react'

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const store = useOffTargetStore()
  const [showModifyPanel, setShowModifyPanel] = useState(false)
  const [actionType, setActionType] = useState<'mark_anomaly' | 'approve_anomaly' | 'modify_opinion'>('mark_anomaly')
  const [reason, setReason] = useState('')
  const [newOpinion, setNewOpinion] = useState('')
  const [operator, setOperator] = useState('当前用户')

  useEffect(() => {
    store.initialize()
  }, [])

  const candidate = store.candidates.find((c) => c.id === id)
  if (!candidate) {
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>未找到该候选记录</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal-600 hover:underline text-sm">
          返回总览
        </button>
      </div>
    )
  }

  const batch = store.getReagentBatch(candidate.reagentBatchId)
  const candidateLogs = store.getAuditLogsByCandidate(candidate.id)
  const batchCandidates = store.getCandidatesByBatch(candidate.reagentBatchId)
  const batchAnomalies = batchCandidates.filter((c) => c.status === 'anomaly' || c.status === 'approved')
  const batchLogs = store.getAuditLogsByBatch(candidate.reagentBatchId)

  const handleSubmit = () => {
    if (!reason.trim()) return
    if (actionType === 'mark_anomaly') {
      store.markAnomaly(candidate.id, reason, operator)
    } else if (actionType === 'approve_anomaly') {
      store.approveAnomaly(candidate.id, reason, operator)
    } else if (actionType === 'modify_opinion') {
      if (!newOpinion.trim()) return
      store.modifyOpinion(candidate.id, newOpinion, reason, operator)
    }
    setShowModifyPanel(false)
    setReason('')
    setNewOpinion('')
  }

  const statusLabel: Record<string, { text: string; color: string; icon: typeof AlertTriangle }> = {
    normal: { text: '正常', color: 'text-zinc-600 bg-zinc-100', icon: CheckCircle },
    anomaly: { text: '异常', color: 'text-orange-600 bg-orange-100', icon: AlertTriangle },
    approved: { text: '已复核通过', color: 'text-teal-600 bg-teal-100', icon: Shield },
  }
  const currentStatus = statusLabel[candidate.status]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-800">候选明细与追溯</h1>
          <p className="text-sm text-zinc-500">ID: {candidate.id} | {candidate.sampleId}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${currentStatus.color}`}>
          <currentStatus.icon className="w-4 h-4" />
          {currentStatus.text}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">候选详情</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                ['样本ID', candidate.sampleId],
                ['靶点位置', candidate.targetSite],
                ['脱靶位点', candidate.offTargetSite],
                ['序列', candidate.sequence],
                ['错配数', `${candidate.mismatchCount}`],
                ['正负链', candidate.strand],
                ['阴性对照结果', candidate.negControlResult === 'normal' ? '正常' : candidate.negControlResult === 'abnormal' ? '异常' : '待定'],
                ['创建时间', new Date(candidate.createdAt).toLocaleString('zh-CN')],
                ['更新时间', new Date(candidate.updatedAt).toLocaleString('zh-CN')],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs text-zinc-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-zinc-800 font-mono-data break-all">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <span className="text-xs text-zinc-400">处理意见</span>
              <p className="text-sm text-zinc-700 mt-1">{candidate.processingOpinion}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">试剂批号追溯链</h2>
            <div className="space-y-0">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-teal-700">1</span>
                  </div>
                  <div className="w-px h-full bg-zinc-200 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-zinc-700">当前脱靶候选</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono-data">
                    {candidate.sampleId} | {candidate.offTargetSite}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="w-px h-full bg-zinc-200 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-zinc-700">样本</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono-data">{candidate.sampleId}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-orange-700">3</span>
                  </div>
                  <div className="w-px h-full bg-zinc-200 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-zinc-700">试剂批号</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono-data text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                      {batch?.batchNo || '-'}
                    </span>
                    <span className="text-xs text-zinc-500">{batch?.reagentName}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    供应商: {batch?.supplier} | 接收日期: {batch?.receivedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-700">该批次关联异常</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    共 {batchAnomalies.length} 条异常/已复核记录（含当前候选）
                  </p>
                  {batchAnomalies.filter((c) => c.id !== candidate.id).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/candidate/${c.id}`)}
                      className="mt-2 p-2 bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100 transition-colors"
                    >
                      <p className="text-xs font-mono-data text-zinc-600">{c.sampleId} | {c.offTargetSite}</p>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">{c.processingOpinion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {candidateLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4">该候选的修正历史</h2>
              <div className="space-y-3">
                {candidateLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 p-3 bg-zinc-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-zinc-700">{log.operator}</span>
                        <span className="text-zinc-400">
                          {log.action === 'mark_anomaly' ? '标记异常' : log.action === 'approve_anomaly' ? '复核通过' : '修改意见'}
                        </span>
                        <span className="text-zinc-300">|</span>
                        <span className="text-zinc-400">{new Date(log.operatedAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        <span className="line-through">{log.oldValue}</span>
                        <ChevronRight className="w-3 h-3 inline mx-1" />
                        <span className="text-teal-700">{log.newValue}</span>
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">原因: {log.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">操作面板</h2>
            <div className="space-y-2">
              {candidate.status === 'normal' && (
                <button
                  onClick={() => { setActionType('mark_anomaly'); setShowModifyPanel(true) }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  标记异常
                </button>
              )}
              {candidate.status === 'anomaly' && (
                <button
                  onClick={() => { setActionType('approve_anomaly'); setShowModifyPanel(true) }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  复核通过
                </button>
              )}
              <button
                onClick={() => { setActionType('modify_opinion'); setShowModifyPanel(true) }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-50 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                修改处理意见
              </button>
            </div>
          </div>

          {batch && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">试剂批次信息</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">批号</span>
                  <span className="font-mono-data text-orange-700">{batch.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">试剂名称</span>
                  <span className="text-zinc-700">{batch.reagentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">供应商</span>
                  <span className="text-zinc-700">{batch.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">接收日期</span>
                  <span className="text-zinc-700">{batch.receivedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">关联候选数</span>
                  <span className="text-zinc-700">{batchCandidates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">其中异常数</span>
                  <span className="text-orange-600 font-medium">{batchAnomalies.length}</span>
                </div>
              </div>
            </div>
          )}

          {batchLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">该批次审计记录</h2>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {batchLogs.map((log) => (
                  <div key={log.id} className="p-2 bg-zinc-50 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-zinc-400" />
                      <span className="font-medium text-zinc-700">{log.operator}</span>
                      <span className="text-zinc-300">|</span>
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span className="text-zinc-500">{new Date(log.operatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <p className="text-zinc-500 mt-1 truncate">{log.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showModifyPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowModifyPanel(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-zinc-800">
              {actionType === 'mark_anomaly' ? '标记异常' : actionType === 'approve_anomaly' ? '复核通过' : '修改处理意见'}
            </h3>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">操作人</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            {actionType === 'modify_opinion' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">新处理意见</label>
                <textarea
                  value={newOpinion}
                  onChange={(e) => setNewOpinion(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1">
                {actionType === 'mark_anomaly' ? '标记异常原因' : actionType === 'approve_anomaly' ? '复核通过原因' : '修改原因'}
                <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="请填写详细原因，此记录将写入审计日志..."
                className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModifyPanel(false)}
                className="flex-1 px-4 py-2 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || (actionType === 'modify_opinion' && !newOpinion.trim())}
                className="flex-1 px-4 py-2 text-sm bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
