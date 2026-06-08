import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import EddyParticles from './EddyParticles';
import FlowLines from './FlowLines';
import AxisGrid from './AxisGrid';
import ColorLegend from './ColorLegend';
import OutOfBoundsMarkers from './OutOfBoundsMarker';
import { useViewStore } from '@/store/useViewStore';
import { useCameraSync } from '@/hooks/useCameraSync';

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const setCamera = useViewStore((s) => s.setCamera);
  const initPos = useViewStore((s) => s.cameraPosition);
  const initTarget = useViewStore((s) => s.cameraTarget);
  const autoRotate = useViewStore((s) => s.autoRotate);

  useCameraSync(!autoRotate);

  useEffect(() => {
    camera.position.set(initPos.x, initPos.y, initPos.z);
    camera.lookAt(initTarget.x, initTarget.y, initTarget.z);
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={5}
      maxDistance={50}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      target={[initTarget.x, initTarget.y, initTarget.z]}
      onChange={() => {
        if (controlsRef.current) {
          const c = controlsRef.current.object as THREE.PerspectiveCamera;
          const t = controlsRef.current.target as THREE.Vector3;
          setCamera(
            { x: c.position.x, y: c.position.y, z: c.position.z },
            { x: t.x, y: t.y, z: t.z }
          );
        }
      }}
    />
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[8, 12, 6]} intensity={0.7} color="#CFE8FF" />
      <pointLight position={[-6, 3, -4]} intensity={0.45} color="#00D4FF" distance={25} />
      <pointLight position={[5, -2, 5]} intensity={0.35} color="#00D4FF" distance={20} />
    </>
  );
}

export interface FlowFieldSceneHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

export default function FlowFieldScene() {
  return (
    <Canvas
      gl={{ antialias: true, preserveDrawingBuffer: true, alpha: false }}
      camera={{ fov: 50, near: 0.1, far: 200, position: [8, 6, 10] }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0A1628', 1);
        scene.fog = new THREE.FogExp2('#0A1628', 0.035);
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <CameraController />
        <Lights />
        <AxisGrid />
        <FlowLines />
        <EddyParticles />
        <OutOfBoundsMarkers />
        <ColorLegend />
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.9} intensity={0.55} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
