import React from 'react';
import * as THREE from 'three';
import type { SubtitleScreenConfig } from '../../types/seat';

interface SubtitleScreenProps {
  config?: SubtitleScreenConfig;
  hasError?: boolean;
}

export const SubtitleScreen: React.FC<SubtitleScreenProps> = ({ config, hasError }) => {
  if (!config) return null;

  const borderColor = hasError ? '#EF4444' : '#06B6D4';

  return (
    <group
      position={[config.position.x, config.position.y, config.position.z]}
      rotation={[
        (config.rotation.x * Math.PI) / 180,
        (config.rotation.y * Math.PI) / 180,
        (config.rotation.z * Math.PI) / 180,
      ]}
    >
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[config.width + 0.2, config.height + 0.2, 0.15]} />
        <meshStandardMaterial color={borderColor} emissive={borderColor} emissiveIntensity={0.2} />
      </mesh>

      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[config.width, config.height]} />
        <meshStandardMaterial
          color="#1a1a2e"
          emissive="#06B6D4"
          emissiveIntensity={0.1}
          side={2}
        />
      </mesh>

      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[config.width * 0.8, config.height * 0.6]} />
        <meshBasicMaterial color="#06B6D4" transparent opacity={0.3} side={2} />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(config.width, config.height, 0.2)]} />
        <lineBasicMaterial color={borderColor} />
      </lineSegments>
    </group>
  );
};
