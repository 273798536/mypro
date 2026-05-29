import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { VolumeCloud } from './VolumeCloud';
import { Isosurface } from './Isosurface';
import { ClipPlanes } from './ClipPlanes';
import { AxesHelper } from './AxesHelper';

export function OrbitalScene() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={1.2}
        minDistance={5}
        maxDistance={50}
      />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#e0e7ff" />
      <directionalLight position={[-3, -2, 4]} intensity={0.3} color="#7c3aed" />
      <directionalLight position={[0, 3, -5]} intensity={0.2} color="#06b6d4" />

      <VolumeCloud />
      <Isosurface />
      <ClipPlanes />
      <AxesHelper />
    </Canvas>
  );
}
