import { useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore, getFilteredObjects } from '@/store/useAppStore';
import type { HazardObject } from '@/types';
import { HazardMesh } from './HazardMesh';

function CameraRig() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraState = useAppStore((s) => s.cameraState);
  const setCameraState = useAppStore((s) => s.setCameraState);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  targetPos.current.set(...cameraState.position);
  targetLookAt.current.set(...cameraState.target);

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, delta * 3);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 3);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.1}
      minDistance={3}
      maxDistance={50}
      onChange={() => {
        if (controlsRef.current) {
          setCameraState(
            [camera.position.x, camera.position.y, camera.position.z],
            [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
          );
        }
      }}
    />
  );
}

function SceneContent() {
  const layers = useAppStore((s) => s.layers);
  const objects = useAppStore((s) => s.objects);
  const filterState = useAppStore((s) => s.filterState);
  const selectedObjectId = useAppStore((s) => s.selectedObjectId);
  const setSelectedObject = useAppStore((s) => s.setSelectedObject);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredObjects = getFilteredObjects(objects, layers, filterState);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />

      <fog attach="fog" args={['#0a0f1e', 0.04]} />

      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
      />

      {filteredObjects.map((obj: HazardObject) => (
        <group key={obj.id}>
          <HazardMesh
            obj={obj}
            selected={obj.id === selectedObjectId}
            hovered={obj.id === hoveredId}
            onClick={() => setSelectedObject(obj.id)}
            onPointerOver={() => setHoveredId(obj.id)}
            onPointerOut={() => setHoveredId((cur) => (cur === obj.id ? null : cur))}
          />
          {hoveredId === obj.id && (
            <Html
              position={[obj.position[0], obj.position[1] + obj.size[1] * 0.8 + 0.5, obj.position[2]]}
              center
              distanceFactor={10}
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                <div className="text-white text-sm font-medium">{obj.name}</div>
                <div className="text-slate-400 text-xs mt-0.5">
                  {obj.type} · {obj.source}
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <CameraRig />
    </>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 8, 12], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0f1e' }}
      onPointerMissed={() => useAppStore.getState().setSelectedObject(null)}
    >
      <SceneContent />
    </Canvas>
  );
}
