import { useStore } from '../store/useStore'
import { History, User, Clock, AlertTriangle, Shield, FlaskConical, GitBranch } from 'lucide-react'
import { useState } from 'react'

const entityIcons: Record<string, typeof History> = {
  sample: GitBranch,
  sequencing: FlaskConical,
  contamination: AlertTriangle,
  review: Shield,
}

const entityColors: Record<string, string> = {
  sample: 'bg-slate-100 text-slate-700 border-slate-300',
  sequencing: 'bg-teal-50 text-teal-700 border-teal-300',
  contamination: 'bg-red-50 text-red-700 border-red-300',
  review: 'bg-amber-50 text-amber-700 border-amber-300',
}

export default function Audit() {
  const { auditLogs, samples } = useStore()
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const sortedLogs = [...auditLogs].sort(
    (a, b) => b.operatedAt.localeCompare(a.operatedAt)
  )

  const filteredLogs =
    filterType === 'all'
      ? sortedLogs
      : sortedLogs.filter((l) => l.entityType === filterType)

  const contaminationPassedLogs = auditLogs.filter(
    (l) => l.entityType === 'review' && l.action.includes('通过')
  )

  const samplesWithMissingTimestamp = samples.filter((s) => s.missingTimestamp)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-teal-950">审计追踪中心</h2>
        <p className="mt-1 text-sm text-slate-500">查看所有修改记录，追溯谁改的、什么时候改的、为什么改</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">筛选：</span>
            {[
              { value: 'all', label: '全部' },
              { value: 'sequencing', label: '测序结果' },
              { value: 'contamination', label: '污染标记' },
              { value: 'review', label: '复核' },
              { value: 'sample', label: '样本分类' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterType(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  filterType === f.value
                    ? 'bg-teal-950 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-4">
              {filteredLogs.map((log) => {
                const Icon = entityIcons[log.entityType] || History
                const colorClass = entityColors[log.entityType] || 'bg-slate-100 text-slate-700 border-slate-300'
                const isExpanded = expandedLogId === log.id

                return (
                  <div key={log.id} className="relative pl-14">
                    <div className={`absolute left-4 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${colorClass}`}>
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        isExpanded ? 'bg-white shadow-md border-teal-200' : 'bg-white border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm text-teal-950">{log.action}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${colorClass}`}>
                            {log.entityType === 'sample' ? '样本' : log.entityType === 'sequencing' ? '测序' : log.entityType === 'contamination' ? '污染' : '复核'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.operator}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.operatedAt}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">修改理由</p>
                            <p className="text-sm text-slate-700">{log.reason}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                              <p className="text-xs font-medium text-slate-400 mb-1">变更前</p>
                              <p className="text-sm text-slate-600">{log.beforeValue}</p>
                            </div>
                            <div className="rounded-lg bg-white border border-amber-300 p-3">
                              <p className="text-xs font-medium text-amber-600 mb-1">变更后</p>
                              <p className="text-sm text-slate-800 font-medium">{log.afterValue}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              污染复核通过记录
            </h3>
            {contaminationPassedLogs.length > 0 ? (
              <div className="space-y-3">
                {contaminationPassedLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">{log.operator}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 mb-2">
                      <Clock className="h-3 w-3" />
                      {log.operatedAt}
                    </div>
                    <p className="text-sm text-emerald-700">{log.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">暂无污染复核通过记录</p>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              时间点缺失标注
            </h3>
            {samplesWithMissingTimestamp.length > 0 ? (
              <div className="space-y-3">
                {samplesWithMissingTimestamp.map((s) => (
                  <div key={s.id} className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-semibold text-yellow-800">{s.code}</span>
                      <span className="missing-tag">缺失</span>
                    </div>
                    <p className="text-xs text-yellow-700">{s.missingTimestampSource}</p>
                    <p className="mt-1 text-xs text-slate-400">卡在材料：{s.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">所有样本时间点完整</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
