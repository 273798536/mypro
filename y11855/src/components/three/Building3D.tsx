import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Building } from '../../types';
import { BUILDING_TYPE_COLORS } from '../../types';
import { useAppStore, useBuildingIssues, useBuildingCollisions } from '../../store/useAppStore';

interface Building3DProps {
  building: Building;
  isFiltered: boolean;
}

export function Building3D({ building, isFiltered }: Building3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedElement = useAppStore(state => state.selectedElement);
  const visible = useAppStore(state => state.visibleLayers.buildings);
  const isCollisionDetected = useAppStore(state => state.isCollisionDetected);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);
  
  const buildingIssues = useBuildingIssues(building.id);
  const buildingCollisions = useBuildingCollisions(building.id);

  const isSelected = selectedElement?.type === 'building' && selectedElement.id === building.id;
  const hasErrors = buildingIssues.some(i => i.severity === 'error');
  const hasWarnings = buildingIssues.some(i => i.severity === 'warning');
  const hasCollisions = buildingCollisions.length > 0 && isCollisionDetected;

  const baseColor = useMemo(() => {
    if (hasCollisions) return new THREE.Color(0xef4444);
    if (hasErrors) return new THREE.Color(0xf97316);
    if (hasWarnings) return new THREE.Color(0xf59e0b);
    return new THREE.Color(BUILDING_TYPE_COLORS[building.type] || '#6b7280');
  }, [building.type, hasCollisions, hasErrors, hasWarnings]);

  const [posX, posY, posZ] = building.position;
  const [fw, fd] = building.footprint;
  const height = building.height || 1;

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      
      if (isSelected) {
        material.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      } else if (hasCollisions) {
        material.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      } else {
        material.emissiveIntensity = 0;
      }

      if (!isFiltered) {
        material.opacity = Math.max(0.15, material.opacity - 0.05);
        material.transparent = true;
      } else {
        material.opacity = Math.min(1, material.opacity + 0.1);
        material.transparent = hasCollisions || !isFiltered;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({ type: 'building', id: building.id });
  };

  if (!visible) return null;

  return (
    <group position={[posX, posZ, posY]}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[fw, height, fd]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={isSelected ? 0x3b82f6 : hasCollisions ? 0xef4444 : 0x000000}
          emissiveIntensity={0}
          roughness={0.7}
          metalness={0.2}
          transparent={false}
          opacity={1}
        />
      </mesh>



      {isSelected && (
        <>
          <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[fw + 2, height + 2, fd + 2]} />
            <meshBasicMaterial
              color={0x3b82f6}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(fw + 2, height + 2, fd + 2)]} />
            <lineBasicMaterial color={0x3b82f6} linewidth={2} />
          </lineSegments>
        </>
      )}

      {hasCollisions && (
        <mesh position={[0, height + 5, 0]}>
          <cylinderGeometry args={[3, 3, 0.5, 16]} />
          <meshBasicMaterial color={0xef4444} />
        </mesh>
      )}

      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[fw + 4, fd + 4, 0.2]} />
        <meshStandardMaterial
          color={0x1e293b}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}
