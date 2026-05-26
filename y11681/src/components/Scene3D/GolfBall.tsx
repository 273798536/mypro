import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TrajectoryPoint } from '@/types/trajectory';

interface Props {
  points: TrajectoryPoint[];
  progress: number;
  isPlaying: boolean;
  color: string;
}

export function GolfBall({ points, progress, isPlaying, color }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentIndex = Math.min(Math.floor(points.length * progress), points.length - 1);

  useFrame(() => {
    if (meshRef.current && points.length > 0) {
      const idx = Math.max(0, Math.min(points.length - 1, currentIndex));
      const point = points[idx];
      if (point) {
        meshRef.current.position.set(point.x, point.y, point.z);
      }
    }
  });

  if (points.length === 0) return null;

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.021335, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isPlaying ? 0.8 : 0.3}
        metalness={0.1}
        roughness={0.4}
      />
    </mesh>
  );
}
