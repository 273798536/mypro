import { useStore } from '@/store/useStore'
import { Scissors, MoveHorizontal, MoveVertical } from 'lucide-react'

export default function ClippingPanel() {
  const clipping = useStore((s) => s.clipping)
  const setClipping = useStore((s) => s.setClipping)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
          <Scissors size={14} />
          剖切查看
        </div>
        <button
          onClick={() => setClipping({ enabled: !clipping.enabled })}
          className="text-xs font-mono px-2 py-1 rounded"
          style={{
            background: clipping.enabled ? 'rgba(52,152,219,0.2)' : 'rgba(255,255,255,0.05)',
            color: clipping.enabled ? '#3498db' : '#666',
            border: `1px solid ${clipping.enabled ? '#3498db' : '#444'}`,
          }}
        >
          {clipping.enabled ? '关闭剖切' : '开启剖切'}
        </button>
      </div>

      {clipping.enabled && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            <button
              onClick={() => setClipping({ mode: 'horizontal' })}
              className="flex-1 text-xs font-mono px-2 py-1.5 rounded flex items-center justify-center gap-1.5"
              style={{
                background: clipping.mode === 'horizontal' ? 'rgba(52,152,219,0.2)' : 'rgba(255,255,255,0.03)',
                color: clipping.mode === 'horizontal' ? '#3498db' : '#666',
                border: `1px solid ${clipping.mode === 'horizontal' ? '#3498db' : '#333'}`,
              }}
            >
              <MoveHorizontal size={12} />
              水平剖切
            </button>
            <button
              onClick={() => setClipping({ mode: 'vertical' })}
              className="flex-1 text-xs font-mono px-2 py-1.5 rounded flex items-center justify-center gap-1.5"
              style={{
                background: clipping.mode === 'vertical' ? 'rgba(52,152,219,0.2)' : 'rgba(255,255,255,0.03)',
                color: clipping.mode === 'vertical' ? '#3498db' : '#666',
                border: `1px solid ${clipping.mode === 'vertical' ? '#3498db' : '#333'}`,
              }}
            >
              <MoveVertical size={12} />
              垂直剖切
            </button>
          </div>

          {clipping.mode === 'horizontal' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>剖面高度 (Y)</span>
                <span className="font-mono">{clipping.horizontalY.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={-4}
                max={2}
                step={0.1}
                value={clipping.horizontalY}
                onChange={(e) => setClipping({ horizontalY: parseFloat(e.target.value) })}
                className="w-full h-1 accent-blue-400"
              />
            </div>
          )}

          {clipping.mode === 'vertical' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>剖面位置 X</span>
                  <span className="font-mono">{clipping.verticalX.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={clipping.verticalX}
                  onChange={(e) => setClipping({ verticalX: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-blue-400"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>剖面位置 Z</span>
                  <span className="font-mono">{clipping.verticalZ.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={clipping.verticalZ}
                  onChange={(e) => setClipping({ verticalZ: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-blue-400"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
