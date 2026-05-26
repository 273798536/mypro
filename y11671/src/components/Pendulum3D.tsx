import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Pendulum } from '../types';

interface Pendulum3DProps {
  pendulum: Pendulum;
  index: number;
  totalCount: number;
  spacing: number;
}

export function Pendulum3D({ pendulum, index, totalCount, spacing }: Pendulum3DProps) {
  const bobRef = useRef<THREE.Mesh>(null);
  const rodRef = useRef<THREE.Mesh>(null);

  const offsetX = (index - (totalCount - 1) / 2) * spacing;
  const pivotY = 3;
  const pivotZ = 0;

  const bobX = offsetX + Math.sin(pendulum.angle) * pendulum.length;
  const bobY = pivotY - Math.cos(pendulum.angle) * pendulum.length;
  const bobZ = pivotZ;

  const rodLength = pendulum.length;
  const rodMidY = pivotY - rodLength / 2;

  useFrame(() => {
    if (bobRef.current) {
      bobRef.current.position.set(bobX, bobY, bobZ);
      bobRef.current.rotation.z = pendulum.angle;
    }
    if (rodRef.current) {
      rodRef.current.position.set(offsetX, rodMidY, pivotZ);
      rodRef.current.rotation.z = pendulum.angle;
    }
  });

  const bobRadius = 0.12 + pendulum.mass * 0.03;
  const bobColor = pendulum.color;

  return (
    <group>
      <mesh
        ref={rodRef}
        position={[offsetX, rodMidY, pivotZ]}
        rotation={[0, 0, pendulum.angle]}
      >
        <cylinderGeometry args={[0.02, 0.02, rodLength, 8]} />
        <meshStandardMaterial
          color="#64748b"
          transparent
          opacity={0.7}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      <mesh
        ref={bobRef}
        position={[bobX, bobY, bobZ]}
        rotation={[0, 0, pendulum.angle]}
      >
        <sphereGeometry args={[bobRadius, 16, 16]} />
        <meshStandardMaterial
          color={bobColor}
          emissive={bobColor}
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[offsetX, pivotY, pivotZ]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}
