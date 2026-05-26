import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PivotControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { VolatilitySurface } from './VolatilitySurface';
import { SurfacePoints } from './SurfacePoints';
import { AnomalyMarkers } from './AnomalyMarkers';
import type { ProcessedDataPoint } from '@/types';

interface SceneProps {
  dataPoints: ProcessedDataPoint[];
  hoveredPoint: ProcessedDataPoint | null;
  selectedPoint: ProcessedDataPoint | null;
  onPointHover: (point: ProcessedDataPoint | null) => void;
  onPointClick: (point: ProcessedDataPoint) => void;
}

export const Scene = ({
  dataPoints,
  hoveredPoint,
  selectedPoint,
  onPointHover,
  onPointClick,
}: SceneProps) => {
  return (
    <Canvas
      camera={{ position: [8, 8, 8], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 15, 30]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-8, 5, -8]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[8, 3, -8]} intensity={0.3} color="#00D4FF" />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2d4a6f"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <axesHelper args={[6]} />

      <VolatilitySurface
        dataPoints={dataPoints}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />

      <SurfacePoints
        dataPoints={dataPoints}
        hoveredPoint={hoveredPoint}
        selectedPoint={selectedPoint}
        onPointHover={onPointHover}
        onPointClick={onPointClick}
      />

      <AnomalyMarkers
        dataPoints={dataPoints}
        selectedPoint={selectedPoint}
      />

      <AxisLabels />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
        />
        <Vignette darkness={0.5} offset={0.3} />
      </EffectComposer>
    </Canvas>
  );
};

const AxisLabels = () => {
  return (
    <group>
      <group position={[0, -0.5, 0]}>
        <sprite position={[5.5, 0, 0]} scale={[1, 0.5, 1]}>
          <spriteMaterial color="#00D4FF" opacity={0.8} />
        </sprite>
        <sprite position={[-5.5, 0, 0]} scale={[1, 0.5, 1]}>
          <spriteMaterial color="#00D4FF" opacity={0.8} />
        </sprite>
      </group>

      <group position={[0, -0.5, 0]}>
        <sprite position={[0, 0, 5.5]} scale={[0.5, 1, 1]}>
          <spriteMaterial color="#f472b6" opacity={0.8} />
        </sprite>
        <sprite position={[0, 0, -5.5]} scale={[0.5, 1, 1]}>
          <spriteMaterial color="#f472b6" opacity={0.8} />
        </sprite>
      </group>
    </group>
  );
};
