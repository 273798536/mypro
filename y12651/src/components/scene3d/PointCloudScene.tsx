import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useGameStore } from '@/store/useGameStore';
import PointCloud from './PointCloud';
import SectionPlane from './SectionPlane';
import OutlierPoints from './OutlierPoints';

export default function PointCloudScene() {
  const currentFrame = useGameStore((s) => s.currentFrame);
  const frames = useGameStore((s) => s.frames);
  const status = useGameStore((s) => s.status);

  const points = useMemo(() => {
    return frames[currentFrame]?.points || [];
  }, [frames, currentFrame]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [5.5, 4, 6.5], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: 'linear-gradient(180deg, #061020 0%, #0a1628 50%, #0f1e36 100%)' }}
      >
        <color attach="background" args={['#061020']} />
        <fog attach="fog" args={['#061020', 10, 25]} />

        <ambientLight intensity={0.35} color="#88ccee" />
        <directionalLight
          position={[5, 8, 5]}
          intensity={0.8}
          color="#aaddff"
          castShadow
        />
        <pointLight position={[0, 2, 0]} intensity={0.6} color="#00e5ff" distance={8} />

        <Suspense fallback={null}>
          <PointCloud points={points} />
          <SectionPlane />
          <OutlierPoints points={points} />

          <Grid
            position={[0, -3.5, 0]}
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#0f2a4a"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#00e5ff"
            fadeDistance={18}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid
          />

          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={18}
            maxPolarAngle={Math.PI / 2 + 0.2}
            target={[0, 0, 0]}
          />
        </Suspense>

        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={0.7} />
        </EffectComposer>
      </Canvas>

      <div className="absolute top-3 left-3 hud-text text-[10px] text-cyber-cyan/60 space-y-1 font-mono pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyber-cyan inline-block animate-pulse" />
          <span>FRAME {currentFrame.toString().padStart(3, '0')} / {frames.length.toString().padStart(3, '0')}</span>
        </div>
        <div>POINTS: {points.length}</div>
        {status === 'playing' && <div className="text-success-green/80">● LIVE</div>}
        {status === 'paused' && <div className="text-warn-yellow/80">● PAUSED</div>}
      </div>

      <div className="absolute top-3 right-3 hud-text text-[10px] text-cyber-cyan/50 font-mono text-right pointer-events-none space-y-0.5">
        <div>左键旋转 · 右键平移</div>
        <div>滚轮缩放 · 点击点选中</div>
        <div>再次点击标记离群</div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hud-text text-[10px] text-cyber-cyan/40 font-mono pointer-events-none">
        POINT CLOUD SECTION ANALYSIS SYSTEM v1.0
      </div>
    </div>
  );
}
