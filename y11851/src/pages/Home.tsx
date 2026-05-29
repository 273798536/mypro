import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from '@/components/scene/Scene'
import LayerControl from '@/components/ui/LayerControl'
import ConflictList from '@/components/ui/ConflictList'
import CoordinationPanel from '@/components/ui/CoordinationPanel'
import ViewpointManager from '@/components/ui/ViewpointManager'
import ClippingPanel from '@/components/ui/ClippingPanel'
import ReportExport from '@/components/ui/ReportExport'
import { useStore } from '@/store/useStore'
import {
  Layers,
  AlertTriangle,
  ClipboardList,
  Camera,
  X,
} from 'lucide-react'

const PANEL_CONFIG = [
  { key: 'layers' as const, label: '图层', icon: Layers },
  { key: 'conflicts' as const, label: '冲突', icon: AlertTriangle },
  { key: 'coordination' as const, label: '协调', icon: ClipboardList },
  { key: 'viewpoints' as const, label: '视角', icon: Camera },
]

function PanelContent({ panel }: { panel: string | null }) {
  switch (panel) {
    case 'layers':
      return (
        <div className="space-y-4">
          <LayerControl />
          <div className="border-t border-zinc-700/50 pt-3">
            <ClippingPanel />
          </div>
        </div>
      )
    case 'conflicts':
      return <ConflictList />
    case 'coordination':
      return <CoordinationPanel />
    case 'viewpoints':
      return (
        <div className="space-y-4">
          <ViewpointManager />
          <div className="border-t border-zinc-700/50 pt-3">
            <ReportExport />
          </div>
        </div>
      )
    default:
      return null
  }
}

export default function Home() {
  const activePanel = useStore((s) => s.activePanel)
  const setActivePanel = useStore((s) => s.setActivePanel)

  return (
    <div className="h-screen w-screen overflow-hidden flex" style={{ background: '#0d1117' }}>
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [30, 25, 40], fov: 50, near: 0.1, far: 500 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            localClippingEnabled: true,
          }}
          style={{ background: '#0d1117' }}
        >
          <fog attach="fog" args={['#0d1117', 80, 250]} />
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>

        <div className="absolute top-4 left-4 flex flex-col gap-1">
          {PANEL_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActivePanel(key)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
              style={{
                background: activePanel === key ? 'rgba(52,152,219,0.2)' : 'rgba(13,17,23,0.85)',
                color: activePanel === key ? '#3498db' : '#8b949e',
                border: `1px solid ${activePanel === key ? '#3498db' : 'rgba(255,255,255,0.08)'}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-600 font-mono">
          鼠标左键旋转 | 右键平移 | 滚轮缩放 | 点击冲突标记定位
        </div>
      </div>

      {activePanel && (
        <div
          className="w-72 h-full flex flex-col border-l"
          style={{
            background: 'rgba(13,17,23,0.95)',
            borderColor: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-mono font-bold text-zinc-300">
              {PANEL_CONFIG.find((p) => p.key === activePanel)?.label}
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="p-1 rounded hover:bg-zinc-700/50"
            >
              <X size={14} className="text-zinc-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
            <PanelContent panel={activePanel} />
          </div>
        </div>
      )}
    </div>
  )
}
