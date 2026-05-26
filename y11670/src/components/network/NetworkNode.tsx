import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WalletNode } from '../../types';

interface NetworkNodeProps {
  node: WalletNode;
  position: { x: number; y: number; z: number };
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

export const NetworkNode = ({
  node,
  position,
  isSelected,
  isHighlighted,
  isDimmed,
  onClick,
  onDoubleClick,
}: NetworkNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current || !glowRef.current) return;

    const time = state.clock.getElapsedTime();
    const pulseScale = 1 + Math.sin(time * 2 + position.x) * 0.05;
    
    const targetScale = isSelected ? 1.5 : isHighlighted ? 1.2 : hovered ? 1.15 : 1;
    meshRef.current.scale.setScalar(targetScale * pulseScale);
    glowRef.current.scale.setScalar(targetScale * pulseScale * 1.5);

    const opacity = isDimmed && !isSelected && !isHighlighted ? 0.15 : 1;
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opacity;
    (glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.4;
  });

  const getNodeColor = () => {
    if (node.isExchange) return '#00f5ff';
    if (node.isSuspicious) return '#ff3366';
    if (node.status === 'corrected') return '#00ff88';
    if (node.status === 'pending') return '#ffcc00';
    return '#9933ff';
  };

  const getNodeSize = () => {
    const baseSize = 0.8 + node.importance * 1.2;
    return baseSize;
  };

  const color = getNodeColor();
  const size = getNodeSize();

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isHighlighted ? 0.8 : hovered ? 0.5 : 0.2}
          transparent
          opacity={1}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      
      <mesh ref={glowRef} scale={size * 1.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {node.isExchange && (
        <mesh position={[0, size + 0.5, 0]}>
          <ringGeometry args={[0.3, 0.5, 6]} />
          <meshBasicMaterial color="#00f5ff" side={THREE.DoubleSide} />
        </mesh>
      )}

      {node.isSuspicious && (
        <mesh position={[0, size + 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.08, 8, 16]} />
          <meshBasicMaterial color="#ff3366" />
        </mesh>
      )}
    </group>
  );
};
