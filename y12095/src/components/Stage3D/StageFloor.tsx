import React from 'react';
import * as THREE from 'three';

interface StageFloorProps {
  width: number;
  depth: number;
  height: number;
}

export const StageFloor: React.FC<StageFloorProps> = ({ width, depth, height }) => {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width + 4, depth + 4]} />
        <meshStandardMaterial color="#0a0a12" />
      </mesh>

      <gridHelper
        args={[width + 4, 20, '#1a1a2e', '#16213e']}
        position={[0, 0.001, 0]}
      />

      <mesh position={[0, height / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#16213e" metalness={0.3} roughness={0.7} />
      </mesh>

      <mesh position={[0, height + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width - 0.1, depth - 0.1]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.9} />
      </mesh>

      <gridHelper
        args={[width, 12, '#0f4c5c', '#0f4c5c33']}
        position={[0, height + 0.02, 0]}
      />

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#e94560" linewidth={2} />
      </lineSegments>
    </group>
  );
};
