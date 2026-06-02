import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingBlock } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface BuildingMeshProps {
  building: BuildingBlock;
  globalOpacity: number;
}

export function BuildingMesh({ building, globalOpacity }: BuildingMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const [hovered, setHovered] = useState(false);

  const selectedEntity = useAppStore((state) => state.selectedEntity);
  const setSelectedEntity = useAppStore((state) => state.setSelectedEntity);
  const anomalies = useAppStore((state) => state.anomalies);
  const focusedAnomaly = useAppStore((state) => state.focusedAnomaly);

  const isSelected = selectedEntity === building.id;
  const hasAnomaly = building.status === 'anomaly';

  const isInFocusedAnomaly = focusedAnomaly
    ? anomalies
        .find((a) => a.id === focusedAnomaly)
        ?.relatedEntities.includes(building.id)
    : false;

  let color = building.color;
  let opacity = building.opacity * globalOpacity;
  let emissiveIntensity = 0;

  if (isSelected || isInFocusedAnomaly) {
    emissiveIntensity = 0.3;
    opacity = Math.min(1, opacity + 0.15);
  } else if (hasAnomaly) {
    color = '#EF4444';
  }

  if (hovered && !isSelected) {
    emissiveIntensity = 0.15;
  }

  useFrame((state) => {
    if (hasAnomaly && meshRef.current) {
      const pulse = (Math.sin(state.clock.elapsedTime * 3) + 1) / 2;
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = emissiveIntensity + pulse * 0.15;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedEntity(isSelected ? null : building.id);
  };

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      <mesh
        ref={meshRef}
        position={[0, building.dimensions.height / 2, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            building.dimensions.width,
            building.dimensions.height,
            building.dimensions.depth,
          ]}
        />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={isSelected || isInFocusedAnomaly ? '#00D4AA' : color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      <lineSegments ref={edgesRef}>
        <edgesGeometry
          args={[
            new THREE.BoxGeometry(
              building.dimensions.width,
              building.dimensions.height,
              building.dimensions.depth
            ),
          ]}
        />
        <lineBasicMaterial
          color={isSelected || isInFocusedAnomaly ? '#00D4AA' : '#ffffff30'}
          transparent
          opacity={isSelected || isInFocusedAnomaly ? 1 : 0.3}
        />
      </lineSegments>

      {(isSelected || hovered) && (
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry
            args={[building.dimensions.width + 4, building.dimensions.depth + 4]}
          />
          <meshBasicMaterial
            color={hasAnomaly ? '#EF4444' : '#00D4AA'}
            transparent
            opacity={0.2}
          />
        </mesh>
      )}
    </group>
  );
}
