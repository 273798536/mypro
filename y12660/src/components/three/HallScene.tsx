import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { SoundRecord } from '@/types';
import { ConcertHallModel } from './ConcertHallModel';
import { SoundRays } from './SoundRays';
import { AlertTriangle, Camera, Maximize2, RotateCcw } from 'lucide-react';

interface SceneCameraControllerProps {
  record?: SoundRecord;
  resetKey: number;
}

function SceneCameraController({ record, resetKey }: SceneCameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const view = record?.cameraView;
    if (view && view.isValid) {
      camera.position.set(...view.position);
      controlsRef.current?.target.set(...view.target);
      controlsRef.current?.update();
    } else {
      camera.position.set(0, 10, 18);
      controlsRef.current?.target.set(0, 2, -5);
      controlsRef.current?.update();
    }
  }, [record?.id, resetKey, camera, record?.cameraView]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} />;
}

interface SceneProps {
  record?: SoundRecord;
}

export function HallScene({ record }: SceneProps) {
  const resetRef = useRef(0);
  const cameraLost = !record?.cameraView || record.cameraView.isValid === false;

  return (
    <div className="relative w-full h-full bg-[#06111F] rounded-lg overflow-hidden border border-hall-border">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-hall-bg/80 border border-hall-border text-hall-textDim backdrop-blur-sm">
            <Camera size={12} />
            <span>{record?.cameraView?.label ?? '默认视角'}</span>
            <span className="text-hall-textMute/70 ml-1">· FOV {record?.cameraView?.fov ?? 50}°</span>
          </div>
          {cameraLost && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-status-unusable/15 border border-status-unusable/40 text-status-unusable backdrop-blur-sm animate-pulse-border">
              <AlertTriangle size={12} />
              该记录相机视角已丢失，请设计师重新标定
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => {
              resetRef.current += 1;
            }}
            className="btn btn-ghost !px-2 !py-1 text-[11px] bg-hall-bg/70 backdrop-blur-sm"
            title="重置视角"
          >
            <RotateCcw size={12} />
          </button>
          <button className="btn btn-ghost !px-2 !py-1 text-[11px] bg-hall-bg/70 backdrop-blur-sm" title="全屏">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 10, 18]} fov={record?.cameraView?.fov ?? 50} />
        <color attach="background" args={['#06111F']} />

        <ambientLight intensity={0.35} />
        <directionalLight position={[-8, 12, -6]} intensity={0.9} color="#FFF5E1" castShadow />
        <directionalLight position={[6, 4, 8]} intensity={0.35} color="#93C5FD" />
        <pointLight position={[0, 3, -14]} intensity={0.8} color="#FCD34D" distance={20} />

        <Grid
          position={[0, 0.005, 0]}
          args={[40, 40]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1E3A5F"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#2A4A73"
          fadeDistance={40}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <Suspense fallback={null}>
          <ConcertHallModel />
          {record && <SoundRays rays={record.soundRays} />}
          <Environment preset="night" />
        </Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.4} intensity={0.6} mipmapBlur />
        </EffectComposer>

        <SceneCameraController record={record} resetKey={resetRef.current} />
      </Canvas>

      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between text-[10px] text-hall-textMute/80 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FACC15]" /> 声源点</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#10B981]" /> 直达声</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#F43F5E]" /> 被遮挡</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-[#38BDF8]" /> 选中</span>
        </div>
        <div className="text-hall-textMute/60">左键旋转 · 右键平移 · 滚轮缩放 · 单击声线联动详情</div>
      </div>
    </div>
  );
}
