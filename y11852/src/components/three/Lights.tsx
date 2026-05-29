import { useRef } from 'react';
import { useHelper } from '@react-three/drei';
import * as THREE from 'three';

export const Lights = () => {
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      <ambientLight intensity={0.3} color="#7aa2e0" />

      <directionalLight
        ref={keyLightRef}
        position={[15, 20, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <directionalLight
        ref={fillLightRef}
        position={[-10, 8, -5]}
        intensity={0.5}
        color="#93c5fd"
      />

      <directionalLight
        ref={rimLightRef}
        position={[0, 15, -15]}
        intensity={0.6}
        color="#67e8f9"
      />

      <pointLight
        position={[0, 5, -15]}
        intensity={0.8}
        color="#fbbf24"
        distance={30}
      />

      <rectAreaLight
        position={[0, 3, -19]}
        width={12}
        height={4}
        intensity={2}
        color="#fffbeb"
      />
    </>
  );
};
