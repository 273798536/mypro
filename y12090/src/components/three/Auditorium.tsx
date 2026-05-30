import React from 'react';
import * as THREE from 'three';
import type { AuditoriumBounds } from '../../types/seat';

interface AuditoriumProps {
  bounds?: AuditoriumBounds;
}

export const Auditorium: React.FC<AuditoriumProps> = ({ bounds }) => {
  const defaultBounds = {
    min: { x: -15, y: 0, z: -15 },
    max: { x: 15, y: 10, z: 15 },
  };

  const b = bounds || defaultBounds;
  const width = b.max.x - b.min.x;
  const height = b.max.y - b.min.y;
  const depth = b.max.z - b.min.z;
  const centerX = (b.min.x + b.max.x) / 2;
  const centerY = (b.min.y + b.max.y) / 2;
  const centerZ = (b.min.z + b.max.z) / 2;

  return (
    <group position={[centerX, centerY, centerZ]}>
      <mesh receiveShadow position={[0, -height / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1a2e" side={2} />
      </mesh>

      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, height, 0.2]} />
        <meshStandardMaterial color="#16213e" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.2]} />
        <meshStandardMaterial color="#16213e" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.2]} />
        <meshStandardMaterial color="#16213e" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh position={[0, 0, -depth / 2 - 1]}>
        <boxGeometry args={[12, 6, 0.5]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>

      <mesh position={[0, 2.5, -depth / 2 - 0.7]}>
        <boxGeometry args={[8, 3, 0.1]} />
        <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.3} />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#06B6D4" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
};
