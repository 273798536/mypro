import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import SurfaceMesh from './SurfaceMesh';
import SurfaceAxes from './SurfaceAxes';
import ExtremumMarkers from './ExtremumMarkers';
import CrossSectionPlane from './CrossSectionPlane';

export default function Scene() {
  return (
    <Canvas
      style={{ background: '#060a14' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <PerspectiveCamera makeDefault position={[5, 4, 5]} fov={50} near={0.1} far={1000} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={50}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-3, 6, -3]} intensity={0.4} color="#4488ff" />
      <hemisphereLight args={['#4488ff', '#001122', 0.3]} />

      <fog attach="fog" args={['#060a14', 30, 80]} />

      <Suspense fallback={null}>
        <SurfaceMesh />
        <SurfaceAxes />
        <ExtremumMarkers />
        <CrossSectionPlane />
      </Suspense>
    </Canvas>
  );
}
