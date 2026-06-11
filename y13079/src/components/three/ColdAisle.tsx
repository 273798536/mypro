import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ColdAisle() {
  const floorRef = useRef<THREE.Mesh>(null);
  const fogPlaneRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (fogPlaneRef.current) {
      const mat = fogPlaneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={floorRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#0A1929" metalness={0.3} roughness={0.8} />
      </mesh>

      <gridHelper
        args={[20, 40, '#00D4FF', '#0E2647']}
        position={[0, 0.005, 0]}
      />

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14.4, 1.8]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.12} />
      </mesh>

      <mesh ref={fogPlaneRef} position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 1.5]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.15} />
      </mesh>

      {[-8, 8].map((x) => (
        <mesh key={`wall-${x}`} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.1, 3, 6]} />
          <meshStandardMaterial color="#132D4F" transparent opacity={0.4} />
        </mesh>
      ))}

      {[-3, 3].map((z) => (
        <mesh key={`side-${z}`} position={[0, 1.5, z]}>
          <boxGeometry args={[16, 3, 0.05]} />
          <meshStandardMaterial color="#1E3A5F" transparent opacity={0.25} />
        </mesh>
      ))}

      {[
        [-7, -2.8],
        [-7, 2.8],
        [7, -2.8],
        [7, 2.8],
      ].map(([x, z], i) => (
        <mesh key={`pillar-${i}`} position={[x, 1.5, z]}>
          <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
          <meshStandardMaterial color="#1E3A5F" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {[-1.5, 0, 1.5].map((z) => (
        <pointLight
          key={`light-${z}`}
          position={[0, 2.8, z]}
          color="#00D4FF"
          intensity={0.8}
          distance={6}
          decay={2}
        />
      ))}
    </group>
  );
}
