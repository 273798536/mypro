import React from 'react';
import type { Crane as CraneType } from '../../types';

interface CraneProps {
  crane: CraneType;
  radiusScale: number;
}

export const Crane: React.FC<CraneProps> = ({ crane, radiusScale }) => {
  const effectiveRadius = Math.min(crane.radius, radiusScale);

  return (
    <group position={[crane.position.x, crane.position.y, crane.position.z]}>
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[1, 10, 1]} />
        <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.3} />
      </mesh>

      <mesh position={[0, 10.5, 0]} castShadow>
        <boxGeometry args={[15, 1, 1.5]} />
        <meshStandardMaterial color="#718096" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[effectiveRadius * 0.5, 10.5, 0]} castShadow>
        <boxGeometry args={[effectiveRadius, 0.5, 0.8]} />
        <meshStandardMaterial color="#e53e3e" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0, 13, 0]} castShadow>
        <cylinderGeometry args={[1.5, 2, 2, 8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.2} />
      </mesh>

      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[3, 4, 2, 16]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
};
