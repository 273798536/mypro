import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PointData } from '@/types';
import { useStore } from '@/store/useStore';

const STATUS_COLORS: Record<PointData['status'], string> = {
  normal: '#00D4FF',
  overlap: '#FF9500',
  bad_data: '#FF3B30',
  missing: '#94A3B8',
  late: '#A78BFA',
};

interface RackProps {
  point: PointData;
}

export function Rack({ point }: RackProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedPointId, setSelectedPointId } = useStore();
  const isSelected = selectedPointId === point.id;
  const isAnomaly = point.status !== 'normal';
  const color = STATUS_COLORS[point.status];

  useFrame((state) => {
    if (!meshRef.current) return;
    if (isSelected || isAnomaly) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 2 + point.rackIndex) * 0.2;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const glowIntensity = useMemo(() => {
    if (isSelected) return 2.0;
    if (hovered) return 1.2;
    if (isAnomaly) return 1.0;
    return 0.5;
  }, [isSelected, hovered, isAnomaly]);

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh
        ref={meshRef}
        position={[0, 1.1, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPointId(point.id);
        }}
      >
        <boxGeometry args={[0.8, 2.2, 0.6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glowIntensity * 0.3}
          transparent
          opacity={hovered || isSelected ? 0.85 : 0.55}
          wireframe={false}
        />
      </mesh>

      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.82, 2.22, 0.62]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={isSelected || hovered ? 0.9 : 0.4}
        />
      </mesh>

      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={glowIntensity}
        />
      </mesh>

      {(isSelected || hovered) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
