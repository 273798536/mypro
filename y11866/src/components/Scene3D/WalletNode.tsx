import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { WalletNode as WalletNodeType, RiskLevel, NodeType } from '@/types';
import { getNodeColor, getGlowColor, getNodeRadius, formatAddress, getRiskLabel } from '@/utils/colors';
import { COLORS } from '@/utils/colors';

interface WalletNodeProps {
  node: WalletNodeType;
  position: { x: number; y: number; z: number };
  isSelected: boolean;
  isHighlighted: boolean;
  showLabel: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onDragStart?: (event: { point: THREE.Vector3 }) => void;
  onDrag?: (event: { point: THREE.Vector3 }) => void;
  onDragEnd?: () => void;
}

function getGeometry(type: NodeType) {
  switch (type) {
    case 'relay':
      return <octahedronGeometry args={[1, 0]} />;
    case 'risk':
      return <dodecahedronGeometry args={[1, 0]} />;
    default:
      return <icosahedronGeometry args={[1, 1]} />;
  }
}

export function WalletNode({
  node,
  position,
  isSelected,
  isHighlighted,
  showLabel,
  onClick,
  onPointerOver,
  onPointerOut,
  onDragStart,
  onDrag,
  onDragEnd,
}: WalletNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const color = getNodeColor(node.riskLevel, isSelected, isHighlighted);
  const glowColor = getGlowColor(node.riskLevel, isSelected, isHighlighted);
  const radius = getNodeRadius(node.txCount);
  const scale = isSelected || isHighlighted ? radius * 1.3 : isHovered ? radius * 1.15 : radius;
  const emissiveIntensity = isSelected || isHighlighted ? 0.8 : isHovered ? 0.4 : 0.2;

  const isPending = node.riskLevel === 'pending';
  const isHighRisk = node.riskLevel === 'high';

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    if (meshRef.current) {
      if (node.type === 'relay') {
        meshRef.current.rotation.y = elapsed * 0.5;
        meshRef.current.rotation.x = elapsed * 0.3;
      }
      if (isPending) {
        const pulse = 1 + Math.sin(elapsed * 3) * 0.1;
        meshRef.current.scale.setScalar(scale * pulse);
      }
      if (isHighRisk && !isDragging) {
        const breathe = 1 + Math.sin(elapsed * 2) * 0.08;
        meshRef.current.scale.setScalar(scale * breathe);
      }
    }

    if (glowRef.current) {
      const glowScale = 1.5 + Math.sin(elapsed * 2) * 0.2;
      glowRef.current.scale.setScalar(scale * glowScale);
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (onDragStart) {
      setIsDragging(true);
      onDragStart({ point: e.point });
    }
  };

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    if (isDragging && onDrag) {
      onDrag({ point: e.point });
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (isDragging && onDragEnd) {
      setIsDragging(false);
      onDragEnd();
    }
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = 'pointer';
    onPointerOver();
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    setIsHovered(false);
    if (!isDragging) {
      document.body.style.cursor = 'default';
    }
    onPointerOut();
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick();
  };

  const labelPosition = useMemo(() => ({
    x: position.x,
    y: position.y + scale + 0.5,
    z: position.z,
  }), [position, scale]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={glowRef}
        scale={scale * 1.5}
      >
        {getGeometry(node.type)}
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={scale}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {getGeometry(node.type)}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {(showLabel || isHovered || isSelected) && (
        <Html
          position={[0, scale + 0.3, 0]}
          center
          distanceFactor={15}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="whitespace-nowrap px-2 py-1 rounded text-xs font-mono"
               style={{
                 backgroundColor: 'rgba(10, 22, 40, 0.9)',
                 border: `1px solid ${glowColor}`,
                 color: COLORS.text.primary,
                 boxShadow: `0 0 10px ${glowColor}40`,
               }}>
            <div className="font-semibold">{node.label}</div>
            <div className="text-[10px] opacity-70">{formatAddress(node.id)}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span style={{ color: color }}>{getRiskLabel(node.riskLevel)}</span>
            </div>
          </div>
        </Html>
      )}

      {node.isInternal && (
        <mesh position={[0, scale + 0.3, 0]}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial color={COLORS.node.relay} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

export default WalletNode;
