import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PoolBlockData } from '../../types';
import { getPressureColor, PRESSURE_COLORS } from '../../utils/colorUtils';

interface PoolBlockProps {
  block: PoolBlockData;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export function PoolBlock({ block, isSelected, onClick }: PoolBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const baseColor = block.isRisk
    ? new THREE.Color(PRESSURE_COLORS.CRITICAL)
    : getPressureColor(block.pressureLevel, block.isRisk);

  const emissiveColor = isSelected || hovered
    ? new THREE.Color(0xffffff)
    : baseColor.clone().multiplyScalar(0.3);

  useFrame((state) => {
    if (meshRef.current) {
      if (block.isRisk) {
        const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1;
        meshRef.current.scale.setScalar(pulse);
      }
      if (isSelected) {
        meshRef.current.position.y = block.y + 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[block.x, block.y, block.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(block.id);
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
      castShadow
      receiveShadow
    >
      <boxGeometry args={[block.width, block.height, block.depth]} />
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={isSelected || hovered ? 0.4 : block.isRisk ? 0.3 : 0.1}
        metalness={0.3}
        roughness={0.4}
        transparent
        opacity={hovered ? 0.95 : 0.85}
      />
      {(isSelected || hovered) && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(block.width, block.height, block.depth)]} />
          <lineBasicMaterial color={0xffffff} linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
}
