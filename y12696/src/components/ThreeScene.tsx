import { useRef, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, SSAO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useEffect } from 'react';
import { LockModel } from './scene/LockModel';
import { WaterSurface } from './scene/WaterSurface';
import { DeviceMarkers } from './scene/DeviceMarkers';
import { AnomalyZones } from './scene/AnomalyZones';
import { SectionPlanes } from './scene/SectionPlanes';
import { PointCloudSlice } from './scene/PointCloudSlice';
import { useSceneStore } from '@/stores/useSceneStore';

function CameraController() {
  const controlsRef = useRef<any>(null);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, 3, 0]}
    />
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#89a4cc" />
      <directionalLight
        position={[10, 15, 8]}
        intensity={1.1}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.3}
        color="#6688cc"
      />
      <pointLight
        position={[0, 8, 0]}
        intensity={0.4}
        color="#00d4ff"
        distance={30}
      />
      <hemisphereLight intensity={0.25} args={['#88aacc', '#0a1628', 0.6]} />
    </>
  );
}

function ClippingSetup({ planes }: { planes: THREE.Plane[] }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.clippingPlanes = planes;
    gl.localClippingEnabled = planes.length > 0;
  }, [planes, gl]);
  return null;
}

export function ThreeScene() {
  const sectionPlanes = useSceneStore((s) => s.sectionPlanes);

  const clipPlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    const axisMap: Record<string, [number, number, number]> = {
      x: [1, 0, 0],
      y: [0, 1, 0],
      z: [0, 0, 1],
    };
    (['x', 'y', 'z'] as const).forEach((axis) => {
      const p = sectionPlanes[axis];
      if (p.enabled) {
        const normal = axisMap[axis];
        const plane = new THREE.Plane(
          new THREE.Vector3(...normal),
          p.invert ? p.position : -p.position
        );
        planes.push(plane);
      }
    });
    return planes;
  }, [sectionPlanes]);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 18, 20], fov: 50, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        localClippingEnabled: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #14243d 50%, #1a2e4a 100%)' }}
    >
      <fog attach="fog" args={['#0a1628', 25, 65]} />
      <SceneLighting />
      <CameraController />
      <Stars radius={100} depth={50} count={800} factor={3} fade speed={0.3} />
      <ClippingSetup planes={clipPlanes} />

      <SectionPlanes clipPlanes={clipPlanes} />

      <group>
        <LockModel />
        <WaterSurface />
        <DeviceMarkers />
        <AnomalyZones />
        <PointCloudSlice />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
