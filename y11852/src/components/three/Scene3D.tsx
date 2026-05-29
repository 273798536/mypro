import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { useSceneStore } from '@/store/useSceneStore';
import { useDataStore } from '@/store/useDataStore';
import { Lights } from './Lights';
import { HallModel } from './HallModel';
import { SoundSource } from './SoundSource';
import { SoundRay } from './SoundRay';
import { SeatsArea } from './SeatsArea';
import * as THREE from 'three';

const CameraController = () => {
  const { isCameraOrtho, viewPreset, cameraTarget } = useSceneStore();
  const { camera } = useThree();

  useEffect(() => {
    const presetPositions: Record<string, THREE.Vector3> = {
      perspective: new THREE.Vector3(0, 25, 35),
      top: new THREE.Vector3(0, 60, 0.01),
      front: new THREE.Vector3(0, 8, 50),
      side: new THREE.Vector3(45, 12, 0),
    };

    const targetPos = presetPositions[viewPreset];
    if (targetPos) {
      camera.position.lerp(targetPos, 0.1);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
    }
  }, [viewPreset, camera, cameraTarget]);

  if (isCameraOrtho) {
    return <OrthographicCamera makeDefault position={[0, 25, 35]} zoom={30} />;
  }

  return <PerspectiveCamera makeDefault position={[0, 25, 35]} fov={45} near={0.1} far={1000} />;
};

const SceneContent = () => {
  const { showGrid } = useSceneStore();
  const { hallModel } = useDataStore();

  return (
    <>
      <CameraController />
      <Lights />

      {showGrid && (
        <Grid
          position={[0, 0.001, 0]}
          args={[60, 60]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#27272a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3f3f46"
          fadeDistance={80}
          fadeStrength={1}
          followCamera={false}
        />
      )}

      <HallModel />
      <SoundSource />
      <SeatsArea />
      <SoundRay />

      <fog attach="fog" args={['#0A1628', 30, 80]} />

      <Effects>
        <EffectComposer multisampling={8}>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <DepthOfField
            target={[0, 3, 0]}
            focalLength={0.02}
            bokehScale={2}
          />
          <Vignette eskil={false} offset={0.1} darkness={0.5} />
        </EffectComposer>
      </Effects>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 2, 0]}
      />
    </>
  );
};

export const Scene3D = () => {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      shadows
      style={{ background: 'linear-gradient(180deg, #0A1628 0%, #0d1f3c 50%, #0A1628 100%)' }}
    >
      <color attach="background" args={['#0A1628']} />
      <SceneContent />
    </Canvas>
  );
};
