import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import DentalScene from './DentalScene'
import type { ViewMode, JawType } from '@/types'

interface ContactPointData {
  id: string
  toothNumber: string
  positionX: number
  positionY: number
  positionZ: number
  intensity: number
  isOverlapping: boolean
  isMisaligned: boolean
  jawType: JawType
}

interface DentalViewerProps {
  showHeatmap: boolean
  selectedTooth: string | null
  onSelectTooth: (tooth: string | null) => void
  viewMode: ViewMode
  contactPoints: ContactPointData[]
  dataGaps: string[]
  editable?: boolean
  onPointDrag?: (id: string, x: number, y: number, z: number) => void
}

const CAMERA_POSITIONS: Record<ViewMode, [number, number, number]> = {
  free: [0, 2.5, 4],
  upperTop: [0, 4, 0.5],
  lowerBottom: [0, -4, 0.5],
  side: [4, 0.5, 0],
}

export default function DentalViewer({
  showHeatmap,
  selectedTooth,
  onSelectTooth,
  viewMode,
  contactPoints,
  dataGaps,
  editable,
  onPointDrag,
}: DentalViewerProps) {
  const cameraPos = CAMERA_POSITIONS[viewMode]

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#0a0a1a] to-[#1A1A2E] rounded-xl overflow-hidden">
      {dataGaps.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-dataGap/90 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
          <svg className="w-5 h-5 text-bg-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-sm text-bg-primary font-medium">
            <span className="font-semibold">数据缺口警告：</span>
            {dataGaps.join('；')} — 3D渲染可能不准确，请核实数据源
          </div>
        </div>
      )}

      <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={cameraPos} fov={45} near={0.1} far={100} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={10}
          target={[0, 0, 0]}
        />
        <DentalScene
          showHeatmap={showHeatmap}
          selectedTooth={selectedTooth}
          onSelectTooth={onSelectTooth}
          contactPoints={contactPoints}
          editable={editable}
          onPointDrag={onPointDrag}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-upper inline-block" />
          <span className="text-mono-muted">上颌</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-lower inline-block" />
          <span className="text-mono-muted">下颌</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-misaligned inline-block" />
          <span className="text-mono-muted">错位</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-overlap inline-block animate-pulse-ring" />
          <span className="text-mono-muted">重叠</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-excessive inline-block" />
          <span className="text-mono-muted">过量</span>
        </div>
      </div>
    </div>
  )
}
