import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EquipmentBox } from '@/types';
import { useObjectSelection } from '@/hooks/useObjectSelection';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';

interface Equipment3DProps {
  equipment: EquipmentBox;
}

export function Equipment3D({ equipment }: Equipment3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectedObjectId, handleObjectClick } = useObjectSelection();
  const { isObjectHighlighted, getConflictForObject, getConflictColor } = useConflictHighlight();

  const isSelected = selectedObjectId === equipment.id;
  const isHighlighted = isObjectHighlighted(equipment.id);
  const conflict = getConflictForObject(equipment.id);

  const boxGeometry = useMemo(
    () => new THREE.BoxGeometry(equipment.scale[0], equipment.scale[1], equipment.scale[2]),
    [equipment.scale]
  );

  const edgeGeometry = useMemo(
    () => new THREE.EdgesGeometry(boxGeometry),
    [boxGeometry]
  );

  const displayColor = conflict ? getConflictColor(conflict.type) : equipment.color;

  useFrame((state) => {
    if (groupRef.current) {
      if (isHighlighted) {
        const flash = Math.abs(Math.sin(state.clock.elapsedTime * 5));
        groupRef.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = flash * 1.5;
            if (conflict?.type === 'equipment_block') {
              mat.color.setHex(flash > 0.5 ? 0xffaa00 : 0xff0055);
            }
          }
        });
      } else if (isSelected) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
        groupRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={equipment.position}
      rotation={equipment.rotation}
      onClick={(e) => handleObjectClick(e, equipment.id)}
    >
      <mesh geometry={boxGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.4 : isHighlighted ? 1 : 0.1}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          color={isSelected ? '#00ff88' : isHighlighted ? getConflictColor(conflict?.type || '') : '#666688'}
          transparent
          opacity={isSelected || isHighlighted ? 1 : 0.5}
        />
      </lineSegments>

      <mesh position={[0, equipment.scale[1] / 2 + 0.05, 0]}>
        <planeGeometry args={[equipment.scale[0] * 0.8, 0.15]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
