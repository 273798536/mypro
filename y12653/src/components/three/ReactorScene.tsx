import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import ReactorPart from './ReactorPart';
import ClipPlaneVisuals from './ClipPlaneVisuals';
import { useReactorStore } from '@/store/useReactorStore';

interface ReactorSceneProps {
  mode?: 'section' | 'render';
}

export function SceneContent({ mode }: ReactorSceneProps) {
  const parts = useReactorStore((s) => s.parts);
  const selectedPartId = useReactorStore((s) => s.selectedPartId);
  const clipPlanes = useReactorStore((s) => s.clipPlanes);
  const selectPart = useReactorStore((s) => s.selectPart);
  const toggleClipEnabled = useReactorStore((s) => s.toggleClipEnabled);

  useEffect(() => {
    if (mode === 'section' && !clipPlanes.enabled) {
      toggleClipEnabled();
    }
  }, [mode, clipPlanes.enabled, toggleClipEnabled]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 8, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color="#FF8A3D" />

      {parts.map((part) => (
        <ReactorPart
          key={part.id}
          part={part}
          selected={selectedPartId === part.id}
          onClick={() => selectPart(selectedPartId === part.id ? null : part.id)}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1A3545" metalness={0.3} roughness={0.9} />
      </mesh>

      <ClipPlaneVisuals />

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={0.6} />
        <FXAA />
      </EffectComposer>
    </>
  );
}

export default function ReactorScene({ mode = 'render' }: ReactorSceneProps) {
  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        localClippingEnabled: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      camera={{ position: [6, 5, 8], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 15, 40]} />
      <SceneContent mode={mode} />
    </Canvas>
  );
}
