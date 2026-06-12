import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { fishingSpots, waterQualityList, waterQualityLevelMap } from '@/data/mockData';
import { useAppStore } from '@/store/appStore';

interface FishingSpotMarkerProps {
  spot: (typeof fishingSpots)[0];
  isSelected: boolean;
  onClick: () => void;
}

function FishingSpotMarker({ spot, isSelected, onClick }: FishingSpotMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const waterQuality = waterQualityList.find((wq) => wq.spotId === spot.id);
  const levelColor = waterQuality
    ? waterQualityLevelMap[waterQuality.level].color
    : '#3B82F6';

  const displayColor = isSelected ? '#00D4AA' : hovered ? '#00ffaa' : levelColor;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = 0.3 + Math.sin(time * 1.5 + spot.position[0]) * 0.1;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(time * 2) * 0.3 + (isSelected ? 0.5 : 0);
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={spot.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <coneGeometry args={[0.25, 0.6, 8]} />
        <meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={isSelected ? 1 : 0.5} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={displayColor} emissive={displayColor} emissiveIntensity={isSelected ? 1.5 : 0.8} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={displayColor} transparent opacity={isSelected ? 0.2 : 0.1} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={displayColor} transparent opacity={isSelected ? 0.8 : 0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function FishingSpots() {
  const { selection, selectSpot, filters } = useAppStore();
  const { selectedSpotId } = selection;

  const visibleSpots =
    filters.spotIds.length > 0
      ? fishingSpots.filter((s) => filters.spotIds.includes(s.id))
      : fishingSpots;

  return (
    <group>
      {visibleSpots.map((spot) => (
        <FishingSpotMarker
          key={spot.id}
          spot={spot}
          isSelected={selectedSpotId === spot.id}
          onClick={() => selectSpot(selectedSpotId === spot.id ? null : spot.id)}
        />
      ))}
    </group>
  );
}
