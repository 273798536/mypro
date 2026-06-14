import { Layers, ChevronDown, ChevronRight, FileText, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function LayerPanel() {
  const layers = useAppStore((s) => s.layers)
  const points = useAppStore((s) => s.points)
  const anomalies = useAppStore((s) => s.anomalies)
  const toggleLayer = useAppStore((s) => s.toggleLayer)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))

  return (
    <div className="panel-glass h-full flex flex-col scanline-overlay relative">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-border">
        <Layers size={16} className="text-cyan-industrial" />
        <span className="font-mono text-sm text-cyan-industrial tracking-wide">
          CAD 图层
        </span>
        <span className="ml-auto text-[10px] text-gray-wait font-mono">
          {layers.length} LAYERS
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
        {layers.map((layer) => {
          const layerPoints = points.filter((p) => p.layerId === layer.id)
          const layerAnomalies = anomalies.filter((a) =>
            layerPoints.some((p) => p.id === a.pointId)
          )
          const isExpanded = expanded[layer.id]

          return (
            <div key={layer.id} className="rounded border border-gray-border/60 overflow-hidden">
              <button
                onClick={() => toggleExpand(layer.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 bg-navy-mid/40 hover:bg-navy-mid/70 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleLayer(layer.id)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 accent-cyan-industrial"
                />
                <div
                  className="w-3 h-3 rounded-sm border border-white/20"
                  style={{ background: layer.color }}
                />
                <span className="text-sm text-left flex-1 truncate">
                  {layer.name}
                </span>
                {layerAnomalies.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-orange-alert/20 text-orange-alert border border-orange-alert/40">
                    {layerAnomalies.length}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-wait" />
                ) : (
                  <ChevronRight size={14} className="text-gray-wait" />
                )}
              </button>
              {isExpanded && (
                <div className="px-3 py-2 bg-navy-deep/40 border-t border-gray-border/50 space-y-1.5">
                  <div className="flex items-start gap-2 text-[11px]">
                    <FileText size={12} className="text-gray-wait mt-0.5 shrink-0" />
                    <div className="text-gray-wait min-w-0">
                      <div className="font-mono text-cyan-industrial truncate">
                        {layer.sourceFile}
                      </div>
                      <div className="text-gray-wait/80">
                        CAD行号: {layer.lineStart} - {layer.lineEnd}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-wait">测点数量:</span>
                    <span className="font-mono text-cyan-industrial">{layerPoints.length}</span>
                    {layerAnomalies.length > 0 && (
                      <span className="flex items-center gap-1 ml-auto text-orange-alert">
                        <AlertTriangle size={11} />
                        {layerAnomalies.length} 异常
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="px-3 py-2 border-t border-gray-border text-[10px] text-gray-wait font-mono">
        共 {points.length} 个测点 · {anomalies.length} 个异常
      </div>
    </div>
  )
}
