import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CrackPoint } from '../../types';

interface CrackMarkerProps {
  crack: CrackPoint;
  isSelected: boolean;
  onClick: () => void;
}

export function CrackMarker({ crack, isSelected, onClick }: CrackMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      if (crack.isDuplicate) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        meshRef.current.scale.setScalar(scale);
      }
      if (isSelected) {
        meshRef.current.position.y = crack.z / 10 + 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  const getColor = () => {
    if (crack.isDuplicate) return '#DC2626';
    if (crack.status === 'missing_field') return '#D97706';
    if (crack.status === 'late_added') return '#D97706';
    return '#059669';
  };

  const getSize = () => {
    const baseSize = 0.5 + crack.length * 0.02;
    return isSelected ? baseSize * 1.3 : baseSize;
  };

  return (
    <group position={[crack.x * 0.8, crack.z / 10 + 0.5, crack.y * 0.8]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[getSize(), 16, 16]} />
        <meshStandardMaterial
          color={getColor()}
          emissive={getColor()}
          emissiveIntensity={isSelected || hovered ? 0.6 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.2, 0]}>
          <ringGeometry args={[getSize() + 0.3, getSize() + 0.5, 32]} />
          <meshBasicMaterial color="#3B82F6" side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}

      {crack.isDuplicate && (
        <mesh position={[0, getSize() + 0.5, 0]}>
          <coneGeometry args={[0.3, 0.6, 4]} />
          <meshBasicMaterial color="#DC2626" />
        </mesh>
      )}
    </group>
  );
}
