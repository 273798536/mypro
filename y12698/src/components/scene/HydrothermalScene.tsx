import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Seafloor from './Seafloor';
import Vent from './Vent';
import VentParticles from './VentParticles';
import SectionPlane from './SectionPlane';
import DataMarkers from './DataMarkers';
import SceneLights from './SceneLights';
import { useSceneStore } from '../../store/sceneStore';
import { useCameraAnimation } from '../../hooks/useCameraAnimation';

function CameraSync() {
  const { camera } = useThree();
  const setCamera = useSceneStore((s) => s.setCamera);
  const ref = useRef<THREE.PerspectiveCamera>(camera as THREE.PerspectiveCamera);
  useEffect(() => {
    ref.current = camera as THREE.PerspectiveCamera;
  }, [camera]);
  useEffect(() => {
    setCamera({
      position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: { x: 0, y: -30, z: 0 },
    });
  }, []);
  return null;
}

function ControlsBridge() {
  const controlsRef = useRef<any>(null);
  const setCamera = useSceneStore((s) => s.setCamera);
  const { camera } = useThree();
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={10}
      maxDistance={200}
      maxPolarAngle={Math.PI * 0.48}
      target={[0, -30, 0]}
      onChange={() => {
        if (controlsRef.current) {
          const t = controlsRef.current.target;
          setCamera({
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: t.x, y: t.y, z: t.z },
          });
        }
      }}
    />
  );
}

interface Props {
  glRef: React.MutableRefObject<any>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

function SceneInner({ glRef, cameraRef }: Props) {
  const { gl, camera } = useThree();
  useEffect(() => {
    glRef.current = gl;
    cameraRef.current = camera as THREE.PerspectiveCamera;
  }, [gl, camera, glRef, cameraRef]);

  return (
    <>
      <fog attach="fog" args={['#040810', 60, 180]} />
      <color attach="background" args={['#040810']} />
      <CameraSync />
      <ControlsBridge />
      <SceneLights />
      <Seafloor />
      <Vent position={[0, -28, 0]} height={14} radius={3} intensity={1.1} />
      <VentParticles position={[0, -14, 0]} particleCount={900} height={45} speed={0.09} />
      <Vent position={[30, -22, -20]} height={8} radius={1.8} intensity={0.8} />
      <VentParticles position={[30, -14, -20]} particleCount={500} height={30} speed={0.07} />
      <Vent position={[-25, -26, 25]} height={10} radius={2.2} intensity={0.95} />
      <VentParticles position={[-25, -16, 25]} particleCount={650} height={38} speed={0.08} />
      <SectionPlane />
      <DataMarkers />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.6}
          mipmapBlur
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export default function HydrothermalScene({
  glRef,
  cameraRef,
}: {
  glRef: React.MutableRefObject<any>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [80, 60, 80], fov: 55, near: 0.1, far: 500 }}
      shadows
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneInner glRef={glRef} cameraRef={cameraRef} />
    </Canvas>
  );
}
