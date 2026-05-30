import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useStageStore } from '../../store/useStageStore';
import { StageFloor } from './StageFloor';
import { StageLight } from './StageLight';
import { Obstacle } from './Obstacle';
import { ActorPath } from './ActorPath';
import { ConflictMarker } from './ConflictMarker';

function CameraController() {
  const { viewMode } = useStageStore();
  const { camera } = useThree();
  
  useEffect(() => {
    const positions = {
      perspective: { pos: [0, 12, 15], target: [0, 0, 0] },
      front: { pos: [0, 5, 18], target: [0, 0, 0] },
      side: { pos: [18, 5, 0], target: [0, 0, 0] },
      top: { pos: [0, 18, 0.1], target: [0, 0, 0] },
    };
    
    const config = positions[viewMode];
    camera.position.set(...config.pos as [number, number, number]);
    camera.lookAt(...config.target as [number, number, number]);
  }, [viewMode, camera]);
  
  return null;
}

function AnimationController() {
  const { isPlaying, currentTime, setCurrentTime, routes } = useStageStore();
  const maxDuration = Math.max(...routes.map(r => r.duration), 30);
  
  useFrame((_, delta) => {
    if (isPlaying) {
      const newTime = currentTime + delta * 2;
      setCurrentTime(newTime > maxDuration ? 0 : newTime);
    }
  });
  
  return null;
}

function SmokeEffect() {
  const { smoke } = useStageStore();
  
  if (!smoke.enabled) return null;
  
  return (
    <mesh position={[0, smoke.height / 2, 0]}>
      <boxGeometry args={[20, smoke.height, 20]} />
      <meshBasicMaterial
        color={smoke.color}
        transparent
        opacity={smoke.density * 0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent() {
  const { stage, lights, routes, results, showLabels, showLightCones } = useStageStore();
  
  return (
    <>
      <ambientLight intensity={0.15} />
      
      <StageFloor />
      
      {stage.obstacles.map((obstacle) => (
        <Obstacle key={obstacle.id} obstacle={obstacle} showLabel={showLabels} />
      ))}
      
      {lights.map((light) => (
        <StageLight
          key={light.id}
          light={light}
          showCone={showLightCones}
          showLabel={showLabels}
        />
      ))}
      
      {routes.map((route) => (
        <ActorPath key={route.id} route={route} />
      ))}
      
      {results.map((result) => (
        <ConflictMarker key={result.id} result={result} />
      ))}
      
      <SmokeEffect />
      <AnimationController />
      <CameraController />
      
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function Stage3D() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a14' }}
    >
      <PerspectiveCamera makeDefault position={[0, 12, 15]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
      />
      <SceneContent />
    </Canvas>
  );
}
