import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import CorridorSystem from './CorridorSystem';
import SpaceNodes from './SpaceNodes';
import PathVisualization from './PathVisualization';
import SceneLighting from './SceneLighting';
import FloorGrid from './FloorGrid';

interface Scene3DProps {
  height?: string;
}

const Scene3D = ({ height = '100%' }: Scene3DProps) => {
  return (
    <div style={{ width: '100%', height }}>
      <Canvas
        camera={{ position: [30, 40, 50], fov: 50 }}
        style={{ background: '#0a1628' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />
          <FloorGrid />
          <CorridorSystem />
          <SpaceNodes />
          <PathVisualization />
          <OrbitControls 
            makeDefault 
            enableDamping 
            dampingFactor={0.05}
            minDistance={10}
            maxDistance={100}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Scene3D;
