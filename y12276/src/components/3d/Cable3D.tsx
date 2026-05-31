import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Cable } from '@/types';
import { useObjectSelection } from '@/hooks/useObjectSelection';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';
import { createCableGeometry } from '@/utils/threeHelpers';

interface Cable3DProps {
  cable: Cable;
}

export function Cable3D({ cable }: Cable3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectedObjectId, handleObjectClick } = useObjectSelection();
  const { isObjectHighlighted, getConflictForObject, getConflictColor } = useConflictHighlight();

  const isSelected = selectedObjectId === cable.id;
  const isHighlighted = isObjectHighlighted(cable.id);
  const conflict = getConflictForObject(cable.id);

  const tubeGeometry = useMemo(
    () => createCableGeometry(cable.pathPoints, 60),
    [cable.pathPoints]
  );

  const displayColor = conflict ? getConflictColor(conflict.type) : cable.color;

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (isHighlighted) {
        const flash = Math.abs(Math.sin(state.clock.elapsedTime * 8));
        material.emissiveIntensity = flash * 3;
        if (conflict?.type === 'cable_cross') {
          material.color.setHex(flash > 0.5 ? 0xff0055 : 0xffffff);
        }
      } else if (isSelected) {
        material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      } else {
        material.emissiveIntensity = 0.15;
      }
    }
  });

  return (
    <group position={cable.position} rotation={cable.rotation}>
      <mesh
        ref={meshRef}
        geometry={tubeGeometry}
        onClick={(e) => handleObjectClick(e, cable.id)}
        castShadow
      >
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.5 : isHighlighted ? 2 : 0.15}
          metalness={0.9}
          roughness={0.2}
          transparent
          opacity={isSelected || isHighlighted ? 1 : 0.85}
        />
      </mesh>

      {isSelected && (
        <mesh geometry={tubeGeometry}>
          <meshBasicMaterial
            color="#00ff88"
            transparent
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      {cable.pathPoints.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial
            color={isHighlighted ? '#ff0055' : cable.color}
            transparent
            opacity={isSelected ? 1 : 0.6}
          />
        </mesh>
      ))}
    </group>
  );
}
