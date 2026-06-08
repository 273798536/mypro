import { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import CageMesh from './CageMesh';
import CameraRig, { type CameraRigApi } from './CameraRig';
import CameraPanel from './CameraPanel';
import Legend from './Legend';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { validateCages } from '@/utils/validator';

function BoundsBox() {
  const bounds = useLayoutStore((s) => s.config.bounds);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const d = bounds.maxZ - bounds.minZ;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[w, h, d]} />
      <meshBasicMaterial color={0xef4444} transparent opacity={0.05} wireframe />
    </mesh>
  );
}

function SceneContent({ onRigReady }: { onRigReady: (api: CameraRigApi) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 10, 7]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.3} color="#9ca3af" />

      <Grid
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#475569"
        fadeDistance={50}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, -0.01, 0]}
      />

      <BoundsBox />

      <CageMesh />

      <CameraRig onReady={onRigReady} />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport
          axisColors={['#ef4444', '#22c55e', '#3b82f6']}
          labelColor="#e2e8f0"
        />
      </GizmoHelper>
    </>
  );
}

export default function Scene3D() {
  const [rigApi, setRigApi] = useState<CameraRigApi | null>(null);
  const cages = useLayoutStore((s) => s.cages);
  const config = useLayoutStore((s) => s.config);
  const setIssues = useLayoutStore((s) => s.setIssues);
  const lastSigRef = useRef<string>('');

  useEffect(() => {
    const cageIssues = validateCages(cages, config);
    const sig = cageIssues.map((i) => `${i.type}-${i.cageId ?? ''}-${i.message}`).join('|');
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    const cameraIssues = useLayoutStore
      .getState()
      .issues.filter((i) => i.type === 'camera_lost');
    setIssues([...cageIssues, ...cameraIssues]);
  }, [cages, config, setIssues]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl overflow-hidden border border-slate-700/60">
      <Canvas
        shadows
        camera={{ position: [12, 10, 14], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0b1220']} />
        <fog attach="fog" args={['#0b1220', 25, 80]} />
        <SceneContent onRigReady={setRigApi} />
      </Canvas>
      <Legend />
      <CameraPanel rigApi={rigApi} />
    </div>
  );
}
