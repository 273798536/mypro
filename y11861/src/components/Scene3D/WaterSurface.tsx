import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';

export default function WaterSurface() {
  const terrain = useStore((s) => s.terrain);
  const waterLevel = useStore((s) => s.waterLevel);
  const showSubmergedArea = useStore((s) => s.showSubmergedArea);
  const meshRef = useRef<THREE.Mesh>(null);

  const position = useMemo(() => {
    if (!terrain) return [0, 0, 0] as [number, number, number];
    return [
      0,
      waterLevel * 0.05,
      0,
    ] as [number, number, number];
  }, [terrain, waterLevel]);

  const size = useMemo(() => {
    if (!terrain) return 10;
    return Math.max(terrain.gridSize.width, terrain.gridSize.height) * terrain.cellSize * 0.01;
  }, [terrain]);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.35 + Math.sin(clock.getElapsedTime() * 0.8) * 0.05;
    }
  });

  if (!terrain || !showSubmergedArea || waterLevel <= terrain.minElevation) return null;

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        color="#00bcd4"
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  );
}
