import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { StorageRack } from './StorageRack';
import { Rack, Location } from '../types';

interface RackSceneProps {
  rack: Rack;
  locations: Location[];
}

export function RackScene({ rack, locations }: RackSceneProps) {
  return (
    <Canvas
      camera={{ position: [12, 8, 10], fov: 50 }}
      shadows
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0f0f1a']} />
      <fog attach="fog" args={['#0f0f1a', 20, 50]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[10, 5, -10]} intensity={0.3} color="#f97316" />

      <StorageRack rack={rack} locations={locations} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2}
      />

      <Environment preset="city" />
    </Canvas>
  );
}
