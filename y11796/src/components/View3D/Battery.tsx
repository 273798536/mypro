import { useMemo } from 'react';
import * as THREE from 'three';

interface BatteryProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  voltage: number;
  current: number;
}

export default function Battery({
  position = [0, 0, 0], rotation = [0, 0, 0], voltage, current }: BatteryProps) {
  const segments = useMemo(() => {
    return Math.max(1, Math.min(6, Math.round(voltage / 2)));
  }, [voltage]);
  const intensity = useMemo(() => Math.min(Math.abs(current) * 50, 1), [current]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {Array.from({ length: segments }).map((_, i) => (
        <mesh key={i} position={[0, -0.5 + i * (1 / segments), 0]}>
          <torusGeometry args={[0.41, 0.02, 8, 32]} />
          <meshStandardMaterial
            color={i < Math.ceil(segments * 0.7) ? '#FFD700' : '#444'}
            emissive={i < Math.ceil(segments * 0.7) ? '#FFD700' : '#000'}
            emissiveIntensity={intensity * 0.3}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={intensity * 0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.15, 16]} />
        <meshStandardMaterial
          color="#2a2a2a"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshBasicMaterial
          color={intensity > 0.1 ? '#00FF88' : '#333'}
          transparent
          opacity={0.6 + intensity * 0.4}
        />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshBasicMaterial
          color={intensity > 0.1 ? '#00FF88' : '#333'}
          transparent
          opacity={0.6 + intensity * 0.4}
        />
      </mesh>
    </group>
  );
}
