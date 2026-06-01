
import { useRef } from 'react';
import * as THREE from 'three';
import type { FloorData } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { useFilterStore } from '../../store/useFilterStore';

interface Floor3DProps {
  floor: FloorData;
  isSelected: boolean;
}

export function Floor3D({ floor, isSelected }: Floor3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const setSelectedFloorId = useSceneStore(state => state.setSelectedFloorId);
  const toggleFloor = useFilterStore(state => state.toggleFloor);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  
  const isVisible = selectedFloors.includes(floor.id);
  const floorY = (floor.level - 1) * 5;
  
  if (!isVisible) return null;
  
  const floorColor = isSelected ? '#00D4FF' : floor.color;
  const edgeColor = isSelected ? '#00FFFF' : '#3B82F6';
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedFloorId(floor.id);
  };
  
  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    toggleFloor(floor.id);
  };
  
  return (
    <group ref={groupRef} position={[0, floorY, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <planeGeometry args={[floor.width, floor.height]} />
        <meshStandardMaterial
          color={floorColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[floor.width, floor.height]} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={0.1}
          wireframe
        />
      </mesh>
      
      {floor.walls.map((wall, i) => {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const midX = (wall.start.x + wall.end.x) / 2;
        const midZ = (wall.start.y + wall.end.y) / 2;
        
        return (
          <mesh
            key={i}
            position={[midX, wall.height / 2, midZ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, wall.height, 0.3]} />
            <meshStandardMaterial
              color="#1E3A5F"
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
      
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[38, 40, 64]} />
        <meshBasicMaterial
          color={edgeColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

