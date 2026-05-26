import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Quaternion } from '../../utils/quaternion';
import { quaternionToEuler } from '../../utils/quaternion';

interface SpacecraftModelProps {
  quaternion: Quaternion;
  hasAnomaly?: boolean;
}

export const SpacecraftModel = ({ quaternion, hasAnomaly }: SpacecraftModelProps) => {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const euler = quaternionToEuler(quaternion);
      groupRef.current.rotation.set(euler[0], euler[1], euler[2]);
    }
  });

  const bodyColor = hasAnomaly ? '#ff6b6b' : '#00d4ff';
  const accentColor = hasAnomaly ? '#ff3b30' : '#0099cc';

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 1.5, 8]} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.8}
          roughness={0.2}
          emissive={hasAnomaly ? '#ff0000' : '#003344'}
          emissiveIntensity={hasAnomaly ? 0.3 : 0.1}
        />
      </mesh>

      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.3, 0.6, 8]} />
        <meshStandardMaterial
          color={accentColor}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.9, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.8, 0.05, 0.4]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[-0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <boxGeometry args={[0.8, 0.05, 0.4]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0.75, 0, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.3]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh position={[-0.75, 0, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.3]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh position={[0, 0.3, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00d4ff"
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[0, 0.3, -0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ff0066"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};
