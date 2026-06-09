import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Mesh, SphereGeometry } from 'three';
import type { BrainRegion, RecordStatus } from '@/types';
import { statusColor } from '@/utils/validation';
import { OutOfBoundsRing } from './OutOfBoundsRing';

interface BrainRegionNodeProps {
  region: BrainRegion;
  status: RecordStatus | 'idle';
  isSelected: boolean;
  outOfBounds: boolean;
  hasHighRisk: boolean;
  onClick: () => void;
}

export const BrainRegionNode = ({
  region,
  status,
  isSelected,
  outOfBounds,
  hasHighRisk,
  onClick,
}: BrainRegionNodeProps) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isSelected ? 1.35 : hovered ? 1.18 : 1.0;
      meshRef.current.scale.lerp(
        { x: targetScale, y: targetScale, z: targetScale } as any,
        0.15,
      );
    }
  });

  const baseColor =
    status === 'idle'
      ? '#64748B'
      : hasHighRisk
        ? '#F87171'
        : statusColor[status];

  const emissiveColor = isSelected
    ? '#22D3EE'
    : hovered
      ? baseColor
      : '#000000';

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={region.position}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.4 : 0}
          transparent
          opacity={0.92}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>

      {outOfBounds && <OutOfBoundsRing position={[0, 0, 0]} />}

      {(hovered || isSelected) && (
        <Html
          position={[0, 0.55, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="whitespace-nowrap rounded-md bg-[#0B1026]/95 border border-cyan-400/40 px-2.5 py-1.5 text-[11px] font-mono text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)] backdrop-blur-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <div className="font-semibold text-cyan-300">{region.abbr}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">{region.name}</div>
            <div className="text-[10px] text-slate-400">{region.lobe}</div>
          </div>
        </Html>
      )}
    </group>
  );
};
