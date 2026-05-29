import { EffectComposer } from '@react-three/postprocessing';
import { Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

export function SceneSetup() {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 25, 60]} />

      <ambientLight intensity={0.15} />
      <pointLight position={[15, 20, 15]} intensity={1} color="#e0f2fe" />
      <pointLight position={[-15, 10, -15]} intensity={0.6} color="#818cf8" />
      <pointLight position={[0, 15, -20]} intensity={0.4} color="#22d3ee" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={1.2}
        />
        <Noise opacity={0.03} />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />
      </EffectComposer>
    </>
  );
}
