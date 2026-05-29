import { useSimStore } from '@/store/useSimStore'
import type { Anomaly } from '@/types'
import { AlertTriangle, ShieldAlert, Filter, X } from 'lucide-react'

const ANOMPTY_TYPE_LABELS: Record<Anomaly['type'], { label: string; color: string; icon: React.ReactNode }> = {
  underground: { label: '轨迹穿地', color: '#ff6b35', icon: <ShieldAlert size={12} /> },
  divergence: { label: '阻力发散', color: '#ff3366', icon: <AlertTriangle size={12} /> },
  angle_overflow: { label: '角度越界', color: '#ff3366', icon: <AlertTriangle size={12} /> },
  velocity_invalid: { label: '速度无效', color: '#ff3366', icon: <AlertTriangle size={12} /> },
}

export default function AnomalyPanel() {
  const trajectories = useSimStore(s => s.trajectories)
  const anomalyFilter = useSimStore(s => s.selectedAnomalyFilter)
  const toggleFilter = useSimStore(s => s.toggleAnomalyFilter)
  const setActive = useSimStore(s => s.setActiveTrajectory)
  const removeTraj = useSimStore(s => s.removeTrajectory)

  const allAnomalies = trajectories.flatMap(t =>
    t.anomalies.map(a => ({ ...a, trajId: t.id, trajName: t.params.name })),
  )

  const anomalyTypes = new Set(allAnomalies.map(a => a.type))

  if (trajectories.length === 0) return null

  return (
    <div className="w-[300px] min-w-[300px] h-full bg-[#0d1117] border-l border-[#1e2a3a] flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-[#1e2a3a]">
        <h2 className="text-sm font-bold text-[#ff6b35] tracking-wider uppercase flex items-center gap-2">
          <Filter size={14} />
          异常筛选
        </h2>
      </div>

      {anomalyTypes.size > 0 && (
        <div className="p-3 border-b border-[#1e2a3a]">
          <p className="text-[10px] text-[#8892a4] mb-2">点击过滤异常类型</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(anomalyTypes).map(type => {
              const info = ANOMPTY_TYPE_LABELS[type]
              const isFiltered = anomalyFilter.has(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors ${isFiltered ? 'opacity-30 line-through' : ''}`}
                  style={{ background: info.color + '20', color: info.color, border: `1px solid ${info.color}40` }}
                >
                  {info.icon}
                  {info.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="p-3 flex-1">
        <p className="text-[10px] text-[#8892a4] uppercase tracking-wider mb-2">轨迹列表</p>
        <div className="flex flex-col gap-2">
          {trajectories.map(traj => (
            <div
              key={traj.id}
              onClick={() => setActive(traj.id)}
              className="bg-[#1a1f2e] rounded-lg p-2.5 cursor-pointer hover:bg-[#2a3040] transition-colors border border-transparent hover:border-[#00d4ff]/30 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#c8d0dc] font-mono truncate">{traj.params.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); removeTraj(traj.id) }}
                  className="opacity-0 group-hover:opacity-100 text-[#8892a4] hover:text-[#ff3366] transition-all"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-[#8892a4] font-mono">
                <span>射程 {traj.maxRange}m</span>
                <span>高度 {traj.maxHeight}m</span>
                <span>时间 {traj.flightTime}s</span>
              </div>
              {traj.anomalies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {traj.anomalies.map((a, i) => {
                    const info = ANOMPTY_TYPE_LABELS[a.type]
                    return (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: info.color + '20', color: info.color }}>
                        {info.label}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
