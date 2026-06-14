import { AlertTriangle, Locate, AlertOctagon, AlertCircle, XCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { AnomalyType } from '@/types'

const TYPE_LABELS: Record<AnomalyType | 'all', { label: string; icon: any; color: string }> = {
  all: { label: '全部', icon: AlertTriangle, color: 'text-cyan-industrial border-cyan-industrial/50' },
  overlap: { label: '重叠', icon: AlertOctagon, color: 'text-orange-alert border-orange-alert/50' },
  missing: { label: '缺失', icon: AlertCircle, color: 'text-gray-wait border-gray-wait/50' },
  outlier: { label: '越界', icon: XCircle, color: 'text-pink-400 border-pink-400/50' },
  dirty: { label: '脏数据', icon: AlertTriangle, color: 'text-yellow-400 border-yellow-400/50' },
}

const ANOMALY_DESC: Record<AnomalyType, string> = {
  overlap: '间距 < 0.5m',
  missing: '等间距序列缺失',
  outlier: 'X 超出 ±5m',
  dirty: 'CAD字段异常',
}

export default function AnomalyPanel() {
  const anomalies = useAppStore((s) => s.anomalies)
  const points = useAppStore((s) => s.points)
  const layers = useAppStore((s) => s.layers)
  const activeFilter = useAppStore((s) => s.activeAnomalyFilter)
  const setFilter = useAppStore((s) => s.setAnomalyFilter)
  const focusPoint = useAppStore((s) => s.focusPoint)
  const selectedPointId = useAppStore((s) => s.selectedPointId)

  const filtered = activeFilter === 'all' ? anomalies : anomalies.filter((a) => a.type === activeFilter)

  return (
    <div className="panel-glass h-full flex flex-col scanline-overlay relative">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-border">
        <AlertTriangle size={16} className="text-orange-alert" />
        <span className="font-mono text-sm text-orange-alert tracking-wide">异常检测</span>
        <span className="ml-auto text-[10px] text-gray-wait font-mono">
          {anomalies.length} ISSUES
        </span>
      </div>
      <div className="flex gap-1 p-2 border-b border-gray-border/50 flex-wrap">
        {(Object.keys(TYPE_LABELS) as Array<AnomalyType | 'all'>).map((k) => {
          const info = TYPE_LABELS[k]
          const Icon = info.icon
          const count =
            k === 'all' ? anomalies.length : anomalies.filter((a) => a.type === k).length
          const active = activeFilter === k
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-mono transition-all ${
                active
                  ? `${info.color} bg-current/10`
                  : 'border-gray-border/60 text-gray-wait hover:border-gray-border hover:text-gray-300'
              }`}
            >
              <Icon size={11} />
              <span>{info.label}</span>
              <span className={`${active ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center text-gray-wait text-xs py-8">
            暂无匹配异常
          </div>
        )}
        {filtered.map((a) => {
          const pt = points.find((p) => p.id === a.pointId)
          const layer = layers.find((l) => l.id === pt?.layerId)
          const info = TYPE_LABELS[a.type]
          const Icon = info.icon
          const isSelected = selectedPointId === a.pointId
          return (
            <div
              key={a.id}
              className={`rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'border-cyan-industrial bg-cyan-industrial/10 shadow-glow-cyan'
                  : 'border-gray-border/60 bg-navy-mid/30 hover:border-gray-border hover:bg-navy-mid/60'
              }`}
              onClick={() => focusPoint(a.pointId)}
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                <Icon size={14} className={info.color.split(' ')[0]} />
                <span className="font-mono text-xs text-cyan-industrial">{a.pointId}</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded border ${info.color}`}>
                  {info.label}
                </span>
                <button
                  className="ml-auto p-1 rounded hover:bg-cyan-industrial/20 text-cyan-industrial"
                  onClick={(e) => {
                    e.stopPropagation()
                    focusPoint(a.pointId)
                  }}
                  title="定位到3D视图"
                >
                  <Locate size={12} />
                </button>
              </div>
              <div className="px-2.5 pb-2 space-y-1">
                <div className="text-[11px] text-gray-300">{a.description}</div>
                <div className="text-[10px] text-gray-wait font-mono bg-navy-deep/60 px-2 py-1 rounded border border-gray-border/40">
                  {a.cadReference}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-wait">
                  <span>图层: {layer?.name}</span>
                  {a.relatedPointIds.length > 0 && (
                    <span>关联: {a.relatedPointIds.join(', ')}</span>
                  )}
                </div>
                {pt && (
                  <div className="text-[10px] text-gray-wait/80">
                    坐标: X={pt.x.toFixed(2)} Y={pt.y.toFixed(2)} Z={pt.z.toFixed(2)} · {ANOMALY_DESC[a.type]}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
