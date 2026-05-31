import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={[-15, 0, 0]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      
      <mesh ref={glowRef} scale={1.2}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial
          color="#FFA500"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      <pointLight color="#FFF5E0" intensity={2} distance={100} decay={0.5} />
      <pointLight color="#FFD700" intensity={1} distance={50} decay={1} />
    </group>
  );
}
