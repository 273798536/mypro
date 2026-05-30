import React, { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Musician } from '@/types';

interface Musician3DProps {
  musician: Musician;
  isSelected: boolean;
  stageHeight: number;
  onSelect: (id: string | null) => void;
  onDragEnd: (id: string, x: number, z: number) => void;
}

export const Musician3D: React.FC<Musician3DProps> = ({
  musician,
  isSelected,
  stageHeight,
  onSelect,
  onDragEnd,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDragging(true);
    onSelect(musician.id);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isDragging && groupRef.current) {
      const pos = groupRef.current.position;
      onDragEnd(musician.id, pos.x, pos.z);
    }
    setIsDragging(false);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isDragging && groupRef.current) {
      e.stopPropagation();
      const point = e.point;
      groupRef.current.position.x = Math.max(-5, Math.min(5, point.x));
      groupRef.current.position.z = Math.max(-3.5, Math.min(3.5, point.z));
    }
  };

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = stageHeight + 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[musician.x, stageHeight + 0.5, musician.z]}
      rotation={[0, (musician.rotation * Math.PI) / 180, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[musician.radius, musician.radius, 0.05, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#e94560' : musician.color}
          transparent
          opacity={isSelected ? 0.6 : 0.3}
        />
      </mesh>

      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
        <meshStandardMaterial
          color={musician.color}
          metalness={0.3}
          roughness={0.5}
          emissive={isSelected || hovered ? musician.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.1 : 0}
        />
      </mesh>

      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={musician.color}
          metalness={0.3}
          roughness={0.5}
          emissive={isSelected || hovered ? musician.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.1 : 0}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[musician.radius + 0.1, musician.radius + 0.15, 32]} />
          <meshBasicMaterial color="#e94560" side={THREE.DoubleSide} />
        </mesh>
      )}

      <Html
        position={[0, 1.6, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            background: isSelected ? '#e94560' : 'rgba(22, 33, 62, 0.95)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
            border: isSelected ? '2px solid #fff' : '1px solid #0f4c5c',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{musician.name}</div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>{musician.instrument}</div>
        </div>
      </Html>
    </group>
  );
};
