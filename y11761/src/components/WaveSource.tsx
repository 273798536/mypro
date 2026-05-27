import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WaveSource as WaveSourceType } from '@/types';

interface WaveSourceProps {
  source: WaveSourceType;
  index: number;
  onDrag?: (x: number, y: number) => void;
}

export function WaveSource({ source, index, onDrag }: WaveSourceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const isDragging = useRef(false);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.1 + Math.sin(Date.now() * 0.003) * 0.05;
      meshRef.current.rotation.y += delta * 0.5;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  const color = index === 0 ? '#3E92CC' : '#2A9D8F';

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging.current || !onDrag) return;
    e.stopPropagation();
    const point = e.point;
    onDrag(point.x, point.z);
  };

  return (
    <group position={[source.x, 0, source.y]}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        castShadow
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh ref={glowRef}>
        <ringGeometry args={[0.18, 0.25, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
