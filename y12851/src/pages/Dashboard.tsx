import { useStore } from '@/store/useStore'
import { getRiskLevelLabel } from '@/utils/calcEngine'
import RiskBadge from '@/components/RiskBadge'
import { useNavigate } from 'react-router-dom'
import { Anchor, AlertTriangle, CheckCircle, Camera, Copy, ArrowRight, Database } from 'lucide-react'

export default function Dashboard() {
  const records = useStore((s) => s.buoyRecords)
  const assessments = useStore((s) => s.riskAssessments)
  const duplicates = useStore((s) => s.duplicateGroups)
  const photoGaps = useStore((s) => s.photoGaps)
  const history = useStore((s) => s.assessmentHistory)
  const loadSampleData = useStore((s) => s.loadSampleData)
  const resetData = useStore((s) => s.resetData)
  const navigate = useNavigate()

  const abnormalStations = assessments.filter((a) => a.level !== 'normal').length
  const highRiskStations = assessments.filter((a) => a.level === 'high_risk').length
  const unverified = records.filter((r) => !r.verified).length
  const unresolvedDuplicates = duplicates.filter((d) => !d.resolved).length
  const photoMissing = photoGaps.length
  const historyChanges = history.length

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-ocean-800 flex items-center justify-center">
            <Database size={36} className="text-teal" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ocean-100">近岸水质异常看板</h2>
            <p className="text-sm text-ocean-400 mt-2">加载样例数据开始使用</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={loadSampleData} className="btn-primary">
              加载样例数据
            </button>
          </div>
          <p className="text-xs text-ocean-500 max-w-md">
            样例包含5个浮标站点的监测数据，含传感器故障、重复上报、照片缺失等常见场景
          </p>
        </div>
      </div>
    )
  }

  const levelCounts = {
    normal: assessments.filter((a) => a.level === 'normal').length,
    watch: assessments.filter((a) => a.level === 'watch').length,
    abnormal: assessments.filter((a) => a.level === 'abnormal').length,
    high_risk: assessments.filter((a) => a.level === 'high_risk').length,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ocean-50">看板概览</h1>
          <p className="text-sm text-ocean-400 mt-1">近岸水质异常实时监测</p>
        </div>
        <button onClick={resetData} className="btn-secondary text-sm">
          重置数据
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warn/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-warn" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-warn">{abnormalStations}</p>
              <p className="text-xs text-ocean-400">异常站点</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-danger">{highRiskStations}</p>
              <p className="text-xs text-ocean-400">高风险站点</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ocean-700/50 flex items-center justify-center">
              <CheckCircle size={20} className="text-ocean-300" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-ocean-200">{unverified}</p>
              <p className="text-xs text-ocean-400">待复核</p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-watch/20 flex items-center justify-center">
              <Camera size={20} className="text-watch-dark" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-watch-dark">{photoMissing}</p>
              <p className="text-xs text-ocean-400">照片缺失</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-ocean-300 mb-4">风险等级分布</h3>
          <div className="space-y-3">
            {(['normal', 'watch', 'abnormal', 'high_risk'] as const).map((level) => {
              const count = levelCounts[level]
              const total = assessments.length || 1
              const pct = Math.round((count / total) * 100)
              const barColors: Record<string, string> = {
                normal: 'bg-teal',
                watch: 'bg-watch',
                abnormal: 'bg-warn',
                high_risk: 'bg-danger',
              }
              return (
                <div key={level} className="flex items-center gap-3">
                  <RiskBadge level={level} />
                  <div className="flex-1 h-2 bg-ocean-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColors[level]} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm text-ocean-300 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-medium text-ocean-300 mb-4">站点风险状态</h3>
          <div className="space-y-2">
            {assessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-ocean-800/50">
                <div className="flex items-center gap-2">
                  <Anchor size={14} className="text-ocean-400" />
                  <span className="text-sm text-ocean-200">{a.stationName}</span>
                  {a.photoMissing && (
                    <span className="badge bg-ocean-800 text-ocean-400 border border-ocean-600">待验证</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={a.adjustedLevel} />
                  {a.level !== a.adjustedLevel && (
                    <span className="text-xs text-ocean-500 line-through">
                      {getRiskLevelLabel(a.level)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-medium text-ocean-300 mb-4">待处理事项</h3>
        <div className="space-y-2">
          {unresolvedDuplicates > 0 && (
            <div
              onClick={() => navigate('/duplicate')}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-warn/10 border border-warn/20 cursor-pointer hover:bg-warn/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Copy size={16} className="text-warn" />
                <span className="text-sm text-warn">{unresolvedDuplicates} 组重复上报待处理</span>
              </div>
              <ArrowRight size={16} className="text-ocean-500" />
            </div>
          )}

          {photoMissing > 0 && (
            <div
              onClick={() => navigate('/inspection')}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-watch/10 border border-watch/20 cursor-pointer hover:bg-watch/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Camera size={16} className="text-watch-dark" />
                <span className="text-sm text-watch-dark">{photoMissing} 条记录缺少巡检照片</span>
              </div>
              <ArrowRight size={16} className="text-ocean-500" />
            </div>
          )}

          {unverified > 0 && (
            <div
              onClick={() => navigate('/buoy-data')}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-ocean-800/50 border border-ocean-600 cursor-pointer hover:bg-ocean-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={16} className="text-ocean-300" />
                <span className="text-sm text-ocean-300">{unverified} 条记录待复核</span>
              </div>
              <ArrowRight size={16} className="text-ocean-500" />
            </div>
          )}

          {historyChanges > 0 && (
            <div
              onClick={() => navigate('/risk-layer')}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-teal/10 border border-teal/20 cursor-pointer hover:bg-teal/15 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-teal" />
                <span className="text-sm text-teal">{historyChanges} 次风险等级变更</span>
              </div>
              <ArrowRight size={16} className="text-ocean-500" />
            </div>
          )}

          {unresolvedDuplicates === 0 && photoMissing === 0 && unverified === 0 && historyChanges === 0 && (
            <div className="text-center py-8 text-ocean-500 text-sm">所有事项已处理</div>
          )}
        </div>
      </div>
    </div>
  )
}
