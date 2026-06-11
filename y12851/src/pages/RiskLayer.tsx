import { useStore } from '@/store/useStore'
import { getRiskLevelLabel, METRIC_DEFS } from '@/utils/calcEngine'
import RiskBadge from '@/components/RiskBadge'
import type { RiskLevel } from '@/types'
import { History, ArrowRight } from 'lucide-react'

const RISK_ORDER: Record<RiskLevel, number> = {
  normal: 0,
  watch: 1,
  abnormal: 2,
  high_risk: 3,
}

export default function RiskLayer() {
  const assessments = useStore((s) => s.riskAssessments)
  const historyEntries = useStore((s) => s.assessmentHistory)
  const records = useStore((s) => s.buoyRecords)

  const matrixMetrics = METRIC_DEFS.map((def) => def.key)

  const getMetricStatus = (stationId: string, metricKey: string) => {
    const assess = assessments.find((a) => a.stationId === stationId)
    if (!assess) return 'normal'
    const m = assess.metrics.find((mt) => mt.key === metricKey)
    if (!m) return 'normal'
    if (m.fail) return 'fail'
    if (m.isAbnormal && m.degree >= 50) return 'severe'
    if (m.isAbnormal) return 'mild'
    return 'normal'
  }

  const statusColors: Record<string, string> = {
    normal: 'bg-teal/20 text-teal',
    mild: 'bg-watch/20 text-watch-dark',
    severe: 'bg-warn/20 text-warn',
    fail: 'bg-danger/20 text-danger',
  }

  const getRecordValue = (stationId: string, metricKey: string) => {
    const latestRecord = records
      .filter((r) => r.stationId === stationId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
    if (!latestRecord) return '—'
    const val = latestRecord[metricKey as keyof typeof latestRecord]
    return val !== null ? String(val) : '—'
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ocean-50">风险分层</h1>
        <p className="text-sm text-ocean-400 mt-1">站点风险矩阵与历史回看对比</p>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-ocean-300 mb-4">当前风险矩阵</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-700/50">
                <th className="text-left px-4 py-3 text-ocean-400 font-medium">站点</th>
                {METRIC_DEFS.map((d) => (
                  <th key={d.key} className="text-center px-3 py-3 text-ocean-400 font-medium text-xs">
                    {d.label}
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-ocean-400 font-medium">风险等级</th>
                <th className="text-center px-4 py-3 text-ocean-400 font-medium">照片</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-b border-ocean-700/30">
                  <td className="px-4 py-3 text-ocean-200">{a.stationName}</td>
                  {matrixMetrics.map((mk) => {
                    const status = getMetricStatus(a.stationId, mk)
                    const val = getRecordValue(a.stationId, mk)
                    return (
                      <td key={mk} className="text-center px-3 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-mono ${statusColors[status]}`}>
                          {val}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RiskBadge level={a.adjustedLevel} />
                      {a.level !== a.adjustedLevel && (
                        <span className="text-xs text-ocean-500 line-through">
                          {getRiskLevelLabel(a.level)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.photoMissing ? (
                      <span className="text-xs text-watch-dark">缺失(已降级)</span>
                    ) : (
                      <span className="text-xs text-teal">已关联</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-ocean-300 mb-4 flex items-center gap-2">
          <History size={16} />
          历史回看 — 风险等级变更记录
        </h3>

        {historyEntries.length === 0 ? (
          <div className="text-center py-8 text-ocean-500 text-sm">
            暂无风险等级变更记录，复核修正数据后将在此处显示前后差异
          </div>
        ) : (
          <div className="space-y-3">
            {historyEntries.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 px-4 py-3 rounded-lg bg-ocean-800/50 border border-ocean-700/30"
              >
                <div className="text-sm text-ocean-300 w-36 shrink-0">{h.stationId}</div>
                <div className="flex items-center gap-3">
                  <RiskBadge level={h.previousLevel} />
                  <ArrowRight size={16} className="text-ocean-500" />
                  <RiskBadge level={h.currentLevel} />
                </div>
                <div className="flex-1 text-right">
                  <span className="text-xs text-ocean-500">
                    v{h.previousVersion} → v{h.currentVersion}
                  </span>
                </div>
                <div className="text-xs text-ocean-400 max-w-xs truncate">
                  {h.changeReason}
                </div>
                <div className="text-xs text-ocean-500">
                  {new Date(h.changedAt).toLocaleString('zh-CN')}
                </div>
                <div className="shrink-0">
                  {RISK_ORDER[h.currentLevel] > RISK_ORDER[h.previousLevel] ? (
                    <span className="badge bg-danger/20 text-danger">升级</span>
                  ) : (
                    <span className="badge bg-teal/20 text-teal">降级</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
