import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, FXAA } from '@react-three/postprocessing';
import { ShipModel } from './ShipModel';
import { CargoGrid } from './CargoGrid';
import { StabilityAnnotations } from './StabilityAnnotations';

export const Scene3D: React.FC = () => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [50, 40, 60], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0A1628']} />
        <fog attach="fog" args={['#0A1628', 100, 250]} />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight
          position={[-30, 20, -30]}
          intensity={0.3}
          color="#93C5FD"
        />

        <Suspense fallback={null}>
          <Environment preset="night" />
          <ShipModel />
          <CargoGrid />
          <StabilityAnnotations />
        </Suspense>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={15}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={0.1}
        />

        <EffectComposer>
          <FXAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
