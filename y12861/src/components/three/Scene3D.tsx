import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Effects } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { OceanTerrain } from './OceanTerrain';
import { WaterSurface } from './WaterSurface';
import { FishingSpots } from './FishingSpots';
import { Buoys } from './Buoys';
import { ClippingPlanes } from './ClippingPlanes';

export function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#05101f']} />
        <fog attach="fog" args={['#05101f', 15, 35]} />

        <ambientLight intensity={0.3} color="#4a90d9" />
        <directionalLight
          position={[10, 15, 10]}
          intensity={0.8}
          color="#a8d8ff"
          castShadow
        />
        <pointLight position={[-8, 5, -8]} intensity={0.4} color="#00d4aa" />
        <pointLight position={[8, 3, 8]} intensity={0.3} color="#3b82f6" />

        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />

        <OceanTerrain size={24} segments={48} />
        <WaterSurface />
        <FishingSpots />
        <Buoys />
        <ClippingPlanes />

        <gridHelper args={[24, 24, '#1e3a5f', '#0d2137']} position={[0, -0.01, 0]} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.2}
        />

        <Effects>
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.5} />
          </EffectComposer>
        </Effects>
      </Canvas>
    </div>
  );
}
