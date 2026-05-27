import { useMemo } from 'react';
import * as THREE from 'three';

interface StatorProps {
  radius?: number;
  height?: number;
  teeth?: number;
}

export const Stator = ({ radius = 3, height = 2, teeth = 12 }: StatorProps) => {

  return (
    <group>
      <mesh>
        <cylinderGeometry args={[radius, radius, height, 48]} />
        <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[radius * 0.72, radius * 0.72, height + 0.02, teeth * 2, 1, true]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} side={THREE.BackSide} />
      </mesh>

      {Array.from({ length: teeth }).map((_, i) => {
        const angle = (i / teeth) * Math.PI * 2;
        const x = Math.cos(angle) * radius * 0.78;
        const z = Math.sin(angle) * radius * 0.78;

        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.3, height * 0.95, 0.15]} />
            <meshStandardMaterial color="#718096" metalness={0.5} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
};
