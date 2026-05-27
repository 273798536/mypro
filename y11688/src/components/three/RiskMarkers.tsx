import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Accident } from '@/types';
import { riskColors } from '@/utils/color';

interface RiskMarkersProps {
  accidents: Accident[];
  visible: boolean;
  onAccidentClick?: (accident: Accident) => void;
  selectedId?: string | null;
}

export const RiskMarkers: React.FC<RiskMarkersProps> = ({
  accidents,
  visible,
  onAccidentClick,
  selectedId,
}) => {
  if (!visible) return null;

  return (
    <group>
      {accidents.map((accident) => (
        <AccidentMarker
          key={accident.id}
          accident={accident}
          onClick={() => onAccidentClick?.(accident)}
          isSelected={selectedId === accident.id}
        />
      ))}
    </group>
  );
};

interface AccidentMarkerProps {
  accident: Accident;
  onClick: () => void;
  isSelected: boolean;
}

const AccidentMarker: React.FC<AccidentMarkerProps> = ({
  accident,
  onClick,
  isSelected,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        accident.position.y + 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      groupRef.current.rotation.y += 0.01;
    }
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity =
        0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }
  });

  const color = riskColors[accident.severity];
  const scale =
    accident.severity === 'critical'
      ? 1.5
      : accident.severity === 'high'
      ? 1.2
      : accident.severity === 'medium'
      ? 1
      : 0.8;

  return (
    <group
      ref={groupRef}
      position={[accident.position.x, accident.position.y + 1.5, accident.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh ref={glowRef} scale={scale * 1.5}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={scale}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : 0.4}
        />
      </mesh>
      <mesh position={[0, 0.6, 0]} scale={scale}>
        <coneGeometry args={[0.2, 0.5, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

interface SlopeLabelsProps {
  slopes: { id: string; name: string; bounds: [number, number, number, number] }[];
}

export const SlopeLabels: React.FC<SlopeLabelsProps> = ({ slopes }) => {
  return (
    <group>
      {slopes.map((slope) => {
        const [minX, minZ, maxX, maxZ] = slope.bounds;
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        return (
          <group key={slope.id} position={[centerX, 0.5, centerZ]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[5, 5.5, 32]} />
              <meshBasicMaterial color="#ffffff" opacity={0.2} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
