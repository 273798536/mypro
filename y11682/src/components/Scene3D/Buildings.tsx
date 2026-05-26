import { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Building } from '../../types';

interface BuildingsProps {
  buildings: Building[];
  showShadows: boolean;
  onBuildingClick?: (building: Building) => void;
}

export function Buildings({ buildings, showShadows, onBuildingClick }: BuildingsProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());

  const handleClick = (building: Building, event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onBuildingClick?.(building);
  };

  return (
    <group>
      {buildings.map((building) => (
        <mesh
          key={building.id}
          ref={(el) => {
            if (el) meshRefs.current.set(building.id, el);
          }}
          position={[
            building.position[0],
            building.dimensions[1] / 2,
            building.position[2]
          ]}
          castShadow={showShadows}
          receiveShadow={showShadows}
          onClick={(e) => handleClick(building, e)}
        >
          <boxGeometry args={building.dimensions} />
          <meshStandardMaterial
            color={building.color || '#4A5568'}
            metalness={0.1}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
