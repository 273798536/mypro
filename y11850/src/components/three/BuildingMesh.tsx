import { useRef, useMemo } from 'react';
import { Mesh, EdgesGeometry, LineSegments, BoxGeometry } from 'three';
import { useFrame } from '@react-three/fiber';
import { Building } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface BuildingMeshProps {
  building: Building;
  onClick?: () => void;
}

export function BuildingMesh({ building, onClick }: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const edgesRef = useRef<LineSegments>(null);
  const { selectedBuildingId, selectedFloor, setSelectedBuilding, setSelectedFloor } = useAppStore();
  
  const isSelected = selectedBuildingId === building.id;
  const floorHeight = building.height / building.floors;
  
  const floors = useMemo(() => {
    const result: { y: number; height: number; isHighlighted: boolean }[] = [];
    for (let i = 0; i < building.floors; i++) {
      const floorY = i * floorHeight + floorHeight / 2;
      const isHighlighted = selectedBuildingId === building.id && selectedFloor === i + 1;
      result.push({ y: floorY, height: floorHeight, isHighlighted });
    }
    return result;
  }, [building.id, building.floors, building.height, selectedBuildingId, selectedFloor, floorHeight]);

  useFrame((state) => {
    if (isSelected && meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.01;
      meshRef.current.scale.setScalar(scale);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isSelected) {
      setSelectedBuilding(null);
      setSelectedFloor(null);
    } else {
      setSelectedBuilding(building.id);
    }
    onClick?.();
  };

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  const baseColor = building.color;
  const selectedColor = '#F97316';
  const highlightColor = '#FBBF24';

  return (
    <group position={building.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={building.dimensions} />
        <meshStandardMaterial
          color={isSelected ? selectedColor : baseColor}
          transparent
          opacity={0.85}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {isSelected && floors.map((floor, index) => (
        <mesh
          key={`floor-${index}`}
          position={[0, floor.y - building.height / 2, 0]}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedFloor(index + 1);
          }}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[building.dimensions[0] * 1.02, floor.height * 0.95, building.dimensions[2] * 1.02]} />
          <meshStandardMaterial
            color={floor.isHighlighted ? highlightColor : baseColor}
            transparent
            opacity={floor.isHighlighted ? 0.6 : 0.3}
            emissive={floor.isHighlighted ? highlightColor : '#000000'}
            emissiveIntensity={floor.isHighlighted ? 0.3 : 0}
          />
        </mesh>
      ))}

      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new EdgesGeometry(new BoxGeometry(...building.dimensions))]} />
        <lineBasicMaterial color={isSelected ? selectedColor : '#ffffff'} opacity={0.5} transparent />
      </lineSegments>
    </group>
  );
}
