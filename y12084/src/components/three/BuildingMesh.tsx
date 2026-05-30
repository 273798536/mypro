import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, EdgesGeometry, LineSegments, BoxGeometry } from 'three';
import { Building, Conflict } from '@/types';
import { getSeverityColor } from '@/utils/collision';

interface BuildingMeshProps {
  building: Building;
  conflicts: Conflict[];
  isSelected: boolean;
  onClick: () => void;
}

export default function BuildingMesh({ building, conflicts, isSelected, onClick }: BuildingMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const edgesRef = useRef<LineSegments>(null);
  const [hovered, setHovered] = useState(false);

  const buildingConflicts = useMemo(() =>
    conflicts.filter(c => c.buildingIds.includes(building.id) && !c.resolved),
    [conflicts, building.id]
  );

  const highestSeverity = useMemo(() => {
    if (buildingConflicts.length === 0) return null;
    const severities = ['critical', 'error', 'warning'] as const;
    for (const s of severities) {
      if (buildingConflicts.some(c => c.severity === s)) return s;
    }
    return null;
  }, [buildingConflicts]);

  const baseColor = useMemo(() => {
    if (highestSeverity) return getSeverityColor(highestSeverity);
    switch (building.status) {
      case 'existing': return '#4a5568';
      case 'under-construction': return '#d69e2e';
      case 'proposed':
      default: return '#3182ce';
    }
  }, [highestSeverity, building.status]);

  const displayColor = useMemo(() => {
    if (isSelected) return '#00d4ff';
    if (hovered) return '#63b3ed';
    return baseColor;
  }, [isSelected, hovered, baseColor]);

  const edgesColor = useMemo(() => {
    if (isSelected) return '#00ffff';
    if (highestSeverity === 'critical') return '#ff0000';
    return '#ffffff';
  }, [isSelected, highestSeverity]);

  useFrame((state) => {
    if (!meshRef.current) return;

    if (highestSeverity === 'critical' && !isSelected) {
      const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.setScalar(pulse);
    } else if (isSelected) {
      meshRef.current.position.y = building.position[1] + building.dimensions[1] / 2 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }

    if (edgesRef.current) {
      edgesRef.current.position.y = meshRef.current.position.y;
    }
  });

  const position: [number, number, number] = [
    building.position[0],
    building.position[1] + building.dimensions[1] / 2,
    building.position[2]
  ];

  const edgesGeometry = useMemo(() => {
    const geometry = new EdgesGeometry(
      new BoxGeometry(
        building.dimensions[0] * 1.02,
        building.dimensions[1] * 1.02,
        building.dimensions[2] * 1.02
      )
    );
    return geometry;
  }, [building.dimensions]);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={building.dimensions} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={isSelected ? 0.9 : hovered ? 0.85 : 0.7}
          metalness={0.3}
          roughness={0.7}
          emissive={isSelected ? '#00d4ff' : highestSeverity ? getSeverityColor(highestSeverity) : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : highestSeverity ? 0.15 : 0}
        />
      </mesh>

      <lineSegments
        ref={edgesRef}
        position={[position[0], position[1], position[2]]}
        geometry={edgesGeometry}
      >
        <lineBasicMaterial color={edgesColor} transparent opacity={isSelected ? 1 : 0.6} />
      </lineSegments>

      {hovered && (
        <mesh position={[position[0], position[1] + building.dimensions[1] / 2 + 2, position[2]]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
