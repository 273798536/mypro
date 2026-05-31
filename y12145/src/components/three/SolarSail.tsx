import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSolarSailStore } from '@/store/solarSailStore';

export function SolarSail() {
  const groupRef = useRef<THREE.Group>(null);
  const { position, params } = useSolarSailStore();
  
  const sailScale = Math.min(Math.sqrt(params.sailArea) / 10, 3);
  const angleRad = (params.attitudeAngle * Math.PI) / 180;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x = position.x;
      groupRef.current.position.y = position.y;
      groupRef.current.position.z = position.z;
      groupRef.current.rotation.z = angleRad;
      groupRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[sailScale, sailScale, 16, 16]} />
        <meshStandardMaterial
          color="#FFD700"
          metalness={0.9}
          roughness={0.1}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[sailScale * 0.05, sailScale * 0.05, sailScale * 0.3]} />
        <meshStandardMaterial color="#4A5568" metalness={0.5} roughness={0.5} />
      </mesh>

      <mesh position={[0, 0, 0.25]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#2D3748" metalness={0.3} roughness={0.7} />
      </mesh>

      <group position={[-15, 0, 0]}>
        <arrowHelper
          args={[
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            sailScale * 1.5,
            0x00ff00,
            0.2,
            0.1
          ]}
        />
      </group>
    </group>
  );
}
