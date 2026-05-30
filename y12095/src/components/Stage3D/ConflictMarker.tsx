import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Conflict, SEVERITY_COLORS } from '@/types';

interface ConflictMarkerProps {
  conflict: Conflict;
  isHighlighted: boolean;
  stageHeight: number;
}

export const ConflictMarker: React.FC<ConflictMarkerProps> = ({
  conflict,
  isHighlighted,
  stageHeight,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      pulseRef.current.scale.setScalar(scale);
    }
    if (groupRef.current && isHighlighted) {
      groupRef.current.rotation.y += 0.02;
    }
  });

  const color = SEVERITY_COLORS[conflict.severity];
  const baseSize = conflict.severity === 'critical' ? 0.4 : conflict.severity === 'error' ? 0.3 : 0.25;

  return (
    <group
      ref={groupRef}
      position={[
        conflict.position[0],
        conflict.position[1] + stageHeight,
        conflict.position[2],
      ]}
    >
      <mesh ref={pulseRef}>
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlighted ? 0.6 : 0.3}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[baseSize * 0.6, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh position={[0, baseSize + 0.1, 0]}>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {isHighlighted && (
        <mesh>
          <ringGeometry args={[baseSize * 1.5, baseSize * 1.5 + 0.05, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};
