import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import type { Container as ContainerType, Slot } from '@/@types';

interface Container3DProps {
  container: ContainerType;
  slot: Slot;
  isSelected: boolean;
  isAffected: boolean;
  isModified: boolean;
  hasConflict: boolean;
  onClick: () => void;
}

const CONTAINER_COLORS = {
  dry: '#4A90D9',
  reefer: '#2EC4B6',
  hazardous: '#E63946',
  openTop: '#FF9F1C',
};

const CONTAINER_SIZES = {
  '20GP': { width: 2, height: 1, depth: 1 },
  '40GP': { width: 4, height: 1, depth: 1 },
  '40HQ': { width: 4, height: 1.15, depth: 1 },
};

export function Container3D({
  container,
  slot,
  isSelected,
  isAffected,
  isModified,
  hasConflict,
  onClick,
}: Container3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  const size = CONTAINER_SIZES[container.size];
  const baseColor = CONTAINER_COLORS[container.type];
  
  const x = slot.bay * 2.2;
  const y = slot.tier * 1.1 + size.height / 2;
  const z = slot.row * 1.2;

  useFrame((state) => {
    if (meshRef.current && hasConflict) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
    if (meshRef.current && isAffected) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[x, y, z]}>
      <Box
        ref={meshRef}
        args={[size.width, size.height, size.depth]}
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
        <meshStandardMaterial
          color={baseColor}
          emissive={isSelected || hovered ? baseColor : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
          metalness={0.3}
          roughness={0.7}
        />
      </Box>
      
      {container.isHazardous && (
        <mesh position={[0, size.height / 2 + 0.05, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {isModified && (
        <mesh position={[0, size.height / 2 + 0.1, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial color="#FFD700" side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {isAffected && (
        <mesh position={[0, size.height / 2 + 0.1, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial color="#FF9F1C" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
