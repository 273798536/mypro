import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Stars } from './Stars';
import { Sun } from './Sun';
import { SolarSail } from './SolarSail';
import { OrbitLine } from './OrbitLine';

export function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [10, 10, 20], fov: 60 }}
      style={{ background: 'linear-gradient(to bottom, #0a1628, #1a2744)' }}
    >
      <ambientLight intensity={0.2} />
      
      <Stars />
      <Sun />
      <SolarSail />
      <OrbitLine />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
      
      <gridHelper args={[100, 100, '#1e3a5f', '#0a1628']} position={[0, -10, 0]} />
    </Canvas>
  );
}
