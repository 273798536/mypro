import { useAppStore } from '@/store/useAppStore'
import {
  Layers,
  Search,
  Move3D,
  MoveUp,
  MoveRight,
  CheckSquare,
  Square,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const showFailedPaths = useAppStore((s) => s.showFailedPaths)
  const showForbiddenZones = useAppStore((s) => s.showForbiddenZones)
  const showAnnotations = useAppStore((s) => s.showAnnotations)
  const toggleFailedPaths = useAppStore((s) => s.toggleFailedPaths)
  const toggleForbiddenZones = useAppStore((s) => s.toggleForbiddenZones)
  const toggleAnnotations = useAppStore((s) => s.toggleAnnotations)
  const runConflictDetection = useAppStore((s) => s.runConflictDetection)

  const [viewMode, setViewMode] = useState<'top' | 'side' | 'free'>('free')
  const [layers, setLayers] = useState({
    valve: true,
    route: true,
    forbidden: true,
    annotation: true,
  })

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-r"
      style={{ background: '#0F1D2F', borderRight: '1px solid #1E3A5F' }}
    >
      <div className="flex flex-col gap-4 p-3">
        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
          >
            视角控制
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('top')}
              className="flex flex-1 items-center justify-center gap-1 border-2 py-1.5 text-xs transition-colors"
              style={{
                borderColor: viewMode === 'top' ? '#1E40AF' : '#1E3A5F',
                color: viewMode === 'top' ? '#60A5FA' : '#94A3B8',
                background: viewMode === 'top' ? 'rgba(30,64,175,0.15)' : 'transparent',
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
            >
              <MoveUp size={14} />
              俯视
            </button>
            <button
              onClick={() => setViewMode('side')}
              className="flex flex-1 items-center justify-center gap-1 border-2 py-1.5 text-xs transition-colors"
              style={{
                borderColor: viewMode === 'side' ? '#1E40AF' : '#1E3A5F',
                color: viewMode === 'side' ? '#60A5FA' : '#94A3B8',
                background: viewMode === 'side' ? 'rgba(30,64,175,0.15)' : 'transparent',
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
            >
              <MoveRight size={14} />
              侧视
            </button>
            <button
              onClick={() => setViewMode('free')}
              className="flex flex-1 items-center justify-center gap-1 border-2 py-1.5 text-xs transition-colors"
              style={{
                borderColor: viewMode === 'free' ? '#1E40AF' : '#1E3A5F',
                color: viewMode === 'free' ? '#60A5FA' : '#94A3B8',
                background: viewMode === 'free' ? 'rgba(30,64,175,0.15)' : 'transparent',
                fontFamily: 'Noto Sans SC, sans-serif',
              }}
            >
              <Move3D size={14} />
              自由
            </button>
          </div>
        </div>

        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
          >
            显示控制
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: '#CBD5E1', fontFamily: 'Noto Sans SC, sans-serif' }}>
              {showFailedPaths ? <CheckSquare size={14} style={{ color: '#60A5FA' }} /> : <Square size={14} style={{ color: '#475569' }} />}
              <input type="checkbox" checked={showFailedPaths} onChange={toggleFailedPaths} className="sr-only" />
              显示失败路径
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: '#CBD5E1', fontFamily: 'Noto Sans SC, sans-serif' }}>
              {showForbiddenZones ? <CheckSquare size={14} style={{ color: '#60A5FA' }} /> : <Square size={14} style={{ color: '#475569' }} />}
              <input type="checkbox" checked={showForbiddenZones} onChange={toggleForbiddenZones} className="sr-only" />
              显示禁区
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: '#CBD5E1', fontFamily: 'Noto Sans SC, sans-serif' }}>
              {showAnnotations ? <CheckSquare size={14} style={{ color: '#60A5FA' }} /> : <Square size={14} style={{ color: '#475569' }} />}
              <input type="checkbox" checked={showAnnotations} onChange={toggleAnnotations} className="sr-only" />
              显示标注
            </label>
          </div>
        </div>

        <div>
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: '#60A5FA', fontFamily: 'JetBrains Mono, monospace' }}
          >
            图层控制
          </div>
          <div className="flex flex-col gap-1.5">
            {([
              { key: 'valve' as const, label: '阀门层', icon: <Layers size={14} /> },
              { key: 'route' as const, label: '路线层', icon: <Layers size={14} /> },
              { key: 'forbidden' as const, label: '禁区层', icon: <Layers size={14} /> },
              { key: 'annotation' as const, label: '标注层', icon: <Layers size={14} /> },
            ]).map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-2 text-xs"
                style={{ color: layers[item.key] ? '#CBD5E1' : '#475569', fontFamily: 'Noto Sans SC, sans-serif' }}
              >
                {layers[item.key] ? <CheckSquare size={14} style={{ color: '#059669' }} /> : <Square size={14} style={{ color: '#475569' }} />}
                <input type="checkbox" checked={layers[item.key]} onChange={() => toggleLayer(item.key)} className="sr-only" />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <button
            onClick={runConflictDetection}
            className="flex w-full items-center justify-center gap-2 border-2 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: '#1E40AF',
              color: '#FFFFFF',
              background: '#1E40AF',
              fontFamily: 'Noto Sans SC, sans-serif',
            }}
          >
            <Search size={14} />
            运行冲突检测
          </button>
        </div>
      </div>
    </aside>
  )
}
