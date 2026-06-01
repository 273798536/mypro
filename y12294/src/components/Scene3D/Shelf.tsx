import { useRef } from 'react';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { Shelf as ShelfType } from '../../types';
import { useStore } from '../../store/useStore';

interface ShelfProps {
  shelf: ShelfType;
  isSelected: boolean;
}

export function Shelf({ shelf, isSelected }: ShelfProps) {
  const groupRef = useRef<Group>(null);
  const setSelection = useStore((state) => state.setSelection);

  const { position, dimensions } = shelf;
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const halfDepth = dimensions.depth / 2;

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelection('shelf', shelf.id);
  };

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      <mesh position={[0, halfHeight, 0]}>
        <boxGeometry args={[0.05, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial
          color={isSelected ? '#00D4FF' : '#1e3a5f'}
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[dimensions.width - 0.05, halfHeight, 0]}>
        <boxGeometry args={[0.05, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial
          color={isSelected ? '#00D4FF' : '#1e3a5f'}
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>

      {[0.5, 1.5, 2.5].map((y, i) => (
        <mesh key={i} position={[halfWidth, y, 0]}>
          <boxGeometry args={[dimensions.width, 0.03, dimensions.depth]} />
          <meshStandardMaterial
            color={isSelected ? '#00D4FF' : '#2d4a6f'}
            emissive={isSelected ? '#00D4FF' : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}

      {isSelected && (
        <Html position={[halfWidth, dimensions.height + 0.3, 0]} center distanceFactor={10}>
          <div className="bg-slate-900/95 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-400 whitespace-nowrap font-mono">
            {shelf.name}
          </div>
        </Html>
      )}
    </group>
  );
}
