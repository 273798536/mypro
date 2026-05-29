import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import { COLORS } from '../../utils/color';

export function StarField() {
  const pointsRef = useRef<THREE.Points>(null);
  const STAR_COUNT = 2000;
  
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const col = new Float32Array(STAR_COUNT * 3);
    
    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 30 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
      
      const brightness = 0.3 + Math.random() * 0.7;
      const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.2, brightness);
      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    
    return [pos, col];
  }, []);
  
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      pointsRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={STAR_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export function PostProcessing() {
  return (
    <EffectComposer>
      <DepthOfField
        focusDistance={0.01}
        focalLength={0.02}
        bokehScale={2}
      />
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        height={300}
        intensity={1.5}
      />
      <Vignette
        offset={0.5}
        darkness={0.5}
      />
    </EffectComposer>
  );
}

export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#4A5568" />
      
      <hemisphereLight
        args={['#E2E8F0', '#1A202C', 0.6]}
      />
      
      <pointLight
        position={[15, 10, 10]}
        intensity={1}
        color="#00D4AA"
        distance={50}
      />
      
      <pointLight
        position={[-10, 15, -10]}
        intensity={0.8}
        color="#9D4EDD"
        distance={50}
      />
      
      <pointLight
        position={[5, -5, 15]}
        intensity={0.6}
        color="#FF6B35"
        distance={50}
      />
      
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.5}
        color="#FFFFFF"
        castShadow
      />
    </>
  );
}
