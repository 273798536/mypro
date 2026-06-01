import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function CarModel() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.25, -1.5]}>
        <boxGeometry args={[3.5, 0.5, 5]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.6, -1.8]}>
        <boxGeometry args={[2.8, 0.4, 2.5]} />
        <meshStandardMaterial
          color="#16213e"
          metalness={0.8}
          roughness={0.15}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh position={[0, 0.65, -0.5]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[2.6, 0.08, 0.8]} />
        <meshStandardMaterial
          color="#0f3460"
          metalness={0.95}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, 0.7, 1]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[3, 0.15, 0.6]} />
        <meshStandardMaterial
          color="#e94560"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[-1.3, 0.3, -3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial
          color="#2d2d2d"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[1.3, 0.3, -3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial
          color="#2d2d2d"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[-1.3, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial
          color="#2d2d2d"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      <mesh position={[1.3, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
        <meshStandardMaterial
          color="#2d2d2d"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.7, -3.8]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshStandardMaterial
          color="#e94560"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[-1.5, 0.15, -2.5]}>
        <boxGeometry args={[0.2, 0.1, 0.6]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[1.5, 0.15, -2.5]}>
        <boxGeometry args={[0.2, 0.1, 0.6]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.85, -2.2]}>
        <boxGeometry args={[0.3, 0.15, 0.5]} />
        <meshStandardMaterial
          color="#0f3460"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}
