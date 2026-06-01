import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CarModel } from './CarModel';
import { StreamLines } from './StreamLines';
import { RiskMarkers } from './RiskMarkers';
import { useAppStore } from '../../store/useAppStore';
import { WindParams } from '../../types';

interface SceneContentProps {
  windParams: WindParams;
}

function SceneContent({ windParams }: SceneContentProps) {
  const { streamLines, riskPoints, showRiskLabels, updateStreamLines } = useAppStore();

  useEffect(() => {
    updateStreamLines();
  }, [windParams, updateStreamLines]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <directionalLight position={[0, -5, 0]} intensity={0.2} />

      <CarModel />
      <StreamLines lines={streamLines} />
      <RiskMarkers risks={riskPoints} showLabels={showRiskLabels} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#0a0a14" metalness={0.5} roughness={0.8} />
      </mesh>

      <gridHelper args={[20, 20, '#1a1a2e', '#0f0f1a']} position={[0, 0, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        target={[0, 0.5, -1.5]}
      />

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

interface Scene3DProps {
  windParams?: WindParams;
  className?: string;
}

export function Scene3D({ windParams, className }: Scene3DProps) {
  const { currentWindParams } = useAppStore();
  const params = windParams || currentWindParams;

  return (
    <Canvas
      camera={{ position: [5, 3, 5], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      className={className}
      style={{ background: '#0a0a14' }}
    >
      <SceneContent windParams={params} />
    </Canvas>
  );
}
