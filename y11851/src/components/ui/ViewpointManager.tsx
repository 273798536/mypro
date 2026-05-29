import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import type { Viewpoint } from '@/types'
import { Camera, Save, Trash2, Eye } from 'lucide-react'

export default function ViewpointManager() {
  const viewpoints = useStore((s) => s.viewpoints)
  const addViewpoint = useStore((s) => s.addViewpoint)
  const removeViewpoint = useStore((s) => s.removeViewpoint)
  const [name, setName] = useState('')

  const handleSave = useCallback(() => {
    if (!name.trim()) return
    const canvas = document.querySelector('canvas')
    let cameraPosition: [number, number, number] = [30, 25, 40]
    let cameraTarget: [number, number, number] = [0, -1, 0]
    if (canvas) {
      const r3fState = (canvas as any).__r3f
      if (r3fState?.root?.store?.getState) {
        const state = r3fState.root.store.getState()
        if (state?.camera) {
          const cam = state.camera
          cameraPosition = [cam.position.x, cam.position.y, cam.position.z]
          if (state.controls?.target) {
            cameraTarget = [state.controls.target.x, state.controls.target.y, state.controls.target.z]
          }
        }
      }
    }
    const vp: Viewpoint = {
      id: `vp-${Date.now()}`,
      name: name.trim(),
      cameraPosition,
      cameraTarget,
      timestamp: Date.now(),
    }
    addViewpoint(vp)
    setName('')
  }, [name, addViewpoint])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-mono font-bold text-zinc-300">
        <Camera size={14} />
        视角管理
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入视角名称"
          className="flex-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 rounded px-2 py-1 font-mono placeholder:text-zinc-600"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-2 py-1 rounded text-xs font-mono flex items-center gap-1 disabled:opacity-30"
          style={{
            background: 'rgba(52,152,219,0.2)',
            color: '#3498db',
            border: '1px solid #3498db',
          }}
        >
          <Save size={10} />
          保存
        </button>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {viewpoints.length === 0 && (
          <div className="text-[10px] text-zinc-600 text-center py-3">
            暂无保存的视角
          </div>
        )}
        {viewpoints.map((vp) => (
          <div
            key={vp.id}
            className="flex items-center justify-between rounded px-2 py-1.5"
            style={{
              background: 'rgba(26,35,50,0.6)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div>
              <div className="text-xs text-zinc-300 font-mono">{vp.name}</div>
              <div className="text-[10px] text-zinc-500">
                {new Date(vp.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                <span className="ml-1">({vp.cameraPosition.map((v) => v.toFixed(0)).join(', ')})</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                className="p-1 rounded hover:bg-zinc-700/50"
                title="跳转视角"
              >
                <Eye size={12} className="text-zinc-400" />
              </button>
              <button
                onClick={() => removeViewpoint(vp.id)}
                className="p-1 rounded hover:bg-red-900/30"
                title="删除视角"
              >
                <Trash2 size={12} className="text-zinc-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
