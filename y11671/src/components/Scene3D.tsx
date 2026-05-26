import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { PendulumArray3D } from './PendulumArray3D';

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [6, 4, 8], fov: 50 }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f172a 100%)' }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      <PendulumArray3D />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
