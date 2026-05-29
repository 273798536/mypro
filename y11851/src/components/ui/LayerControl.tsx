import { useStore } from '@/store/useStore'
import { PIPELINE_COLORS, PIPELINE_TYPE_LABELS } from '@/types'
import { versionOptions } from '@/data/sampleData'
import { Layers, Eye, EyeOff } from 'lucide-react'

export default function LayerControl() {
  const layerVisibility = useStore((s) => s.layerVisibility)
  const setLayerVisibility = useStore((s) => s.setLayerVisibility)
  const layerOpacity = useStore((s) => s.layerOpacity)
  const setLayerOpacity = useStore((s) => s.setLayerOpacity)
  const versionFilter = useStore((s) => s.versionFilter)
  const setVersionFilter = useStore((s) => s.setVersionFilter)

  const pipelineLayers: Array<{ key: 'gas' | 'power' | 'drainage'; label: string; color: string }> = [
    { key: 'gas', label: PIPELINE_TYPE_LABELS.gas, color: PIPELINE_COLORS.gas },
    { key: 'power', label: PIPELINE_TYPE_LABELS.power, color: PIPELINE_COLORS.power },
    { key: 'drainage', label: PIPELINE_TYPE_LABELS.drainage, color: PIPELINE_COLORS.drainage },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
        <Layers size={14} />
        管线图层
      </div>

      {pipelineLayers.map(({ key, label, color }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLayerVisibility(key, !layerVisibility[key])}
                className="w-5 h-5 flex items-center justify-center rounded"
                style={{ background: layerVisibility[key] ? color : '#333' }}
              >
                {layerVisibility[key] ? <Eye size={12} color="#fff" /> : <EyeOff size={12} color="#666" />}
              </button>
              <span className="text-xs text-zinc-300 font-mono">{label}</span>
            </div>
            <select
              value={versionFilter[key]}
              onChange={(e) => setVersionFilter(key, e.target.value)}
              className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 rounded px-1 py-0.5 font-mono"
            >
              <option value="all">全部版本</option>
              {versionOptions[key].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pl-7">
            <span className="text-[10px] text-zinc-500">透明度</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={layerOpacity[key]}
              onChange={(e) => setLayerOpacity(key, parseFloat(e.target.value))}
              className="flex-1 h-1 accent-zinc-400"
            />
            <span className="text-[10px] text-zinc-500 w-6 text-right">
              {Math.round(layerOpacity[key] * 100)}%
            </span>
          </div>
        </div>
      ))}

      <div className="border-t border-zinc-700 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayerVisibility('manholes', !layerVisibility.manholes)}
              className="w-5 h-5 flex items-center justify-center rounded"
              style={{ background: layerVisibility.manholes ? '#3498db' : '#333' }}
            >
              {layerVisibility.manholes ? <Eye size={12} color="#fff" /> : <EyeOff size={12} color="#666" />}
            </button>
            <span className="text-xs text-zinc-300 font-mono">井盖点</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayerVisibility('excavation', !layerVisibility.excavation)}
              className="w-5 h-5 flex items-center justify-center rounded"
              style={{ background: layerVisibility.excavation ? '#e74c3c' : '#333' }}
            >
              {layerVisibility.excavation ? <Eye size={12} color="#fff" /> : <EyeOff size={12} color="#666" />}
            </button>
            <span className="text-xs text-zinc-300 font-mono">开挖范围</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">透明度</span>
            <input
              type="range"
              min={0.05}
              max={0.8}
              step={0.05}
              value={layerOpacity.excavation}
              onChange={(e) => setLayerOpacity('excavation', parseFloat(e.target.value))}
              className="w-16 h-1 accent-zinc-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayerVisibility('conflicts', !layerVisibility.conflicts)}
              className="w-5 h-5 flex items-center justify-center rounded"
              style={{ background: layerVisibility.conflicts ? '#e74c3c' : '#333' }}
            >
              {layerVisibility.conflicts ? <Eye size={12} color="#fff" /> : <EyeOff size={12} color="#666" />}
            </button>
            <span className="text-xs text-zinc-300 font-mono">冲突标记</span>
          </div>
        </div>
      </div>
    </div>
  )
}
