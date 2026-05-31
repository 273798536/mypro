import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Musician } from '@/types';
import { useObjectSelection } from '@/hooks/useObjectSelection';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';
import { getPulseScale } from '@/utils/threeHelpers';

interface Musician3DProps {
  musician: Musician;
  showPosition?: [number, number, number] | null;
}

export function Musician3D({ musician, showPosition }: Musician3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectedObjectId, handleObjectClick } = useObjectSelection();
  const { isObjectHighlighted, getConflictForObject, getConflictColor } = useConflictHighlight();

  const isSelected = selectedObjectId === musician.id;
  const isHighlighted = isObjectHighlighted(musician.id);
  const conflict = getConflictForObject(musician.id);

  const displayPosition = showPosition || musician.position;

  const bodyGeometry = useMemo(() => new THREE.CapsuleGeometry(0.3, 1.2, 4, 8), []);
  const headGeometry = useMemo(() => new THREE.SphereGeometry(0.25, 16, 16), []);
  const baseGeometry = useMemo(() => new THREE.CylinderGeometry(0.35, 0.4, 0.1, 16), []);

  const displayColor = conflict ? getConflictColor(conflict.type) : musician.color;

  useFrame((state) => {
    if (groupRef.current) {
      if (isHighlighted) {
        const flash = Math.abs(Math.sin(state.clock.elapsedTime * 6));
        groupRef.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = flash * 2;
          }
        });
      } else if (isSelected) {
        const pulse = getPulseScale(state.clock.elapsedTime, 3, 0.05);
        groupRef.current.scale.setScalar(pulse);
      } else {
        groupRef.current.scale.setScalar(1);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={displayPosition}
      rotation={musician.rotation}
      onClick={(e) => handleObjectClick(e, musician.id)}
    >
      <mesh position={[0, 0.05, 0]} geometry={baseGeometry}>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.5 : isHighlighted ? 1 : 0.2}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 1.0, 0]} geometry={bodyGeometry}>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.3 : isHighlighted ? 0.8 : 0.1}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, 1.9, 0]} geometry={headGeometry}>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.5 : isHighlighted ? 1 : 0.3}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>

      {isSelected && (
        <Text
          position={[0, 3.2, 0]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {musician.role}
        </Text>
      )}
    </group>
  );
}
