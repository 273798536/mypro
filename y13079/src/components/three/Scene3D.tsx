import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Rack } from './Rack';
import { ColdAisle } from './ColdAisle';
import { useStore } from '@/store/useStore';
import { useMemo } from 'react';
import type { PointStatus } from '@/types';

export function Scene3D() {
  const { points, statusFilter, selectedPointId } = useStore();

  const filteredPoints = useMemo(() => {
    if (statusFilter === 'all') return points;
    return points.filter((p) => p.status === (statusFilter as PointStatus));
  }, [points, statusFilter]);

  const anomalyPoints = useMemo(
    () => points.filter((p) => p.status !== 'normal'),
    [points]
  );

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#050E1C']} />
      <fog attach="fog" args={['#050E1C', 10, 25]} />

      <PerspectiveCamera makeDefault position={[8, 7, 8]} fov={45} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 1, 0]}
      />

      <ambientLight intensity={0.3} color="#88AAFF" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.6}
        color="#E8F4FF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.2} color="#00D4FF" />

      <ColdAisle />

      {filteredPoints.map((point) => (
        <Rack key={point.id} point={point} />
      ))}

      {selectedPointId && (
        <pointLight
          position={[
            points.find((p) => p.id === selectedPointId)?.x ?? 0,
            3,
            points.find((p) => p.id === selectedPointId)?.z ?? 0,
          ]}
          color="#FFFFFF"
          intensity={2}
          distance={5}
        />
      )}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
      </EffectComposer>

      <Environment preset="night" />
    </Canvas>
  );
}
