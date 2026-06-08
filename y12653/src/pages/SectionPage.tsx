import { Canvas } from '@react-three/fiber';
import { SceneContent } from '@/components/three/ReactorScene';
import { PresetButtons, CameraPresetController } from '@/components/three/CameraPresets';
import PartFilter from '@/components/section/PartFilter';
import PartDetailPanel from '@/components/section/PartDetailPanel';
import ClipControlBar from '@/components/section/ClipControlBar';

export default function SectionPage() {
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm shrink-0">
        <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          日常剖切巡检
        </h1>
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <div className="w-64 shrink-0">
          <PartFilter />
        </div>

        <div className="flex-1 relative">
          <Canvas
            shadows
            gl={{
              antialias: true,
              localClippingEnabled: true,
            }}
            camera={{ position: [0, 2, 10], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
          >
            <color attach="background" args={['#0A1628']} />
            <fog attach="fog" args={['#0A1628', 15, 40]} />
            <SceneContent mode="section" />
            <CameraPresetController />
          </Canvas>

          <div className="absolute top-4 left-4">
            <PresetButtons />
          </div>
        </div>

        <div className="w-72 shrink-0">
          <PartDetailPanel />
        </div>
      </div>

      <div className="shrink-0">
        <ClipControlBar />
      </div>
    </div>
  );
}
