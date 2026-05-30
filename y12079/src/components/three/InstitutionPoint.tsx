import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { InstitutionWithScore } from '../../types';
import { getInstitutionMarkerColor } from '../../utils/terrainGenerator';

interface InstitutionPointProps {
  institution: InstitutionWithScore;
  isSelected: boolean;
  onClick: () => void;
}

export const InstitutionPoint = ({ institution, isSelected, onClick }: InstitutionPointProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const hasAnomaly = institution.anomalies.length > 0;
  const baseColor = getInstitutionMarkerColor(institution.level, hasAnomaly);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = hovered || isSelected ? 1.3 : 1;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2 + institution.x) * 0.05;
    }
    if (glowRef.current && hasAnomaly) {
      const glowScale = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      glowRef.current.scale.setScalar(glowScale);
    }
  });

  const height = (institution.score / 100) * 0.5;

  return (
    <group position={[institution.x, height, institution.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.15, 8]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.5 : 0.2}
        />
      </mesh>

      {hasAnomaly && (
        <mesh ref={glowRef}>
          <ringGeometry args={[0.12, 0.15, 32]} />
          <meshBasicMaterial
            color="#ff4757"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.05, 0.15, 6]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {(hovered || isSelected) && (
        <Html position={[0, 0.5, 0]} center distanceFactor={10}>
          <div className="bg-bg-secondary border border-accent-blue rounded px-2 py-1 text-xs whitespace-nowrap shadow-glow">
            <div className="font-semibold text-text-primary">{institution.name}</div>
            <div className="text-accent-cyan">得分: {institution.score.toFixed(1)}</div>
            {hasAnomaly && (
              <div className="text-risk-critical">⚠️ 存在异常</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
