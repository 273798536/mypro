import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import TerrainMesh from './TerrainMesh';
import WaterSurface from './WaterSurface';
import VillageMarkers from './VillageMarkers';
import { useStore } from '@/store/useStore';

export default function Scene3D() {
  const validationResults = useStore((s) => s.validationResults);
  const hasErrors = validationResults.some((r) => r.type === 'error');

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [15, 12, 15], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-10, 15, -10]} intensity={0.3} />
        <fog attach="fog" args={['#1a1a2e', 30, 80]} />

        <TerrainMesh />
        <WaterSurface />
        <VillageMarkers />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
        />
        <Environment preset="sunset" />
      </Canvas>

      {hasErrors && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500/70 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm max-w-lg text-center text-sm">
          ⚠ 数据校验发现问题，3D场景可能不准确，请查看右侧校验面板
        </div>
      )}
    </div>
  );
}
