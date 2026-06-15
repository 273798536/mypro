import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { OceanSurface } from './OceanSurface';
import { OilSpillParticles, SpillCenter } from './OilSpillParticles';
import { SceneMarkers } from './SceneMarkers';
import { useSceneStore, useDataStore } from '@/stores';

function ClippingPlane() {
  const { clippingEnabled, clippingPlaneY } = useSceneStore();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  useFrame(() => {
    plane.constant = clippingPlaneY;
  });

  useThree((state) => {
    if (clippingEnabled) {
      state.gl.localClippingEnabled = true;
    } else {
      state.gl.localClippingEnabled = false;
    }
  });

  if (!clippingEnabled) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, clippingPlaneY, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshBasicMaterial
        color="#74c0fc"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        clippingPlanes={[]}
      />
    </mesh>
  );
}

function GridHelper() {
  const gridRef = useRef<THREE.GridHelper>(null);

  return (
    <gridHelper
      ref={gridRef}
      args={[20, 40, '#1e3a5f', '#0f2744']}
      position={[0, -0.01, 0]}
    />
  );
}

interface SceneContentProps {
  centerLat: number;
  centerLon: number;
  scale: number;
}

function SceneContent({ centerLat, centerLon, scale }: SceneContentProps) {
  const { clippingEnabled, clippingPlaneY } = useSceneStore();
  const clippingPlanes = useMemo(() => {
    if (!clippingEnabled) return [];
    return [new THREE.Plane(new THREE.Vector3(0, 1, 0), -clippingPlaneY)];
  }, [clippingEnabled, clippingPlaneY]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.2}
        color="#a5b4fc"
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#74c0fc" />

      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      <fog attach="fog" args={['#030712', 15, 40]} />

      <GridHelper />
      <OceanSurface size={20} />
      <OilSpillParticles centerLat={centerLat} centerLon={centerLon} scale={scale} />
      <SpillCenter centerLat={centerLat} centerLon={centerLon} scale={scale} />
      <SceneMarkers centerLat={centerLat} centerLon={centerLon} scale={scale} />
      <ClippingPlane />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={25}
        target={[0, 0, 0]}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minPolarAngle={0.2}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export function Scene3D() {
  const { centerLat, centerLon, scale } = useDataStore();

  return (
    <Canvas
      camera={{ position: [5, 6, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(to bottom, #030712, #0a2540)' }}
    >
      <SceneContent centerLat={centerLat} centerLon={centerLon} scale={scale} />
    </Canvas>
  );
}
