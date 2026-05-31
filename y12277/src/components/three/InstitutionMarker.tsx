import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Institution, RiskScore, ANOMALY_COLORS, RISK_COLORS } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface InstitutionMarkerProps {
  institution: Institution;
  riskScore?: RiskScore;
  hasAnomaly: boolean;
  anomalyTypes: string[];
}

export function InstitutionMarker({ 
  institution, 
  riskScore,
  hasAnomaly,
  anomalyTypes
}: InstitutionMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const selectedInstitutionId = useAppStore(state => state.selectedInstitutionId);
  const setSelectedInstitutionId = useAppStore(state => state.setSelectedInstitutionId);
  const selectedMonth = useAppStore(state => state.selectedMonth);

  const isSelected = selectedInstitutionId === institution.id;
  const baseHeight = (riskScore?.score || 30) / 100 * 10 + 0.5;

  const color = useMemo(() => {
    if (hasAnomaly && anomalyTypes.includes('missing_month')) {
      return new THREE.Color(ANOMALY_COLORS.missing_month);
    }
    if (hasAnomaly && anomalyTypes.includes('score_anomaly')) {
      return new THREE.Color(ANOMALY_COLORS.score_anomaly);
    }
    return new THREE.Color(RISK_COLORS[riskScore?.level || 'low']);
  }, [riskScore, hasAnomaly, anomalyTypes]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    
    if (cylinderRef.current) {
      const targetScale = hovered || isSelected ? 1.2 : 1;
      const currentScale = cylinderRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.15;
      cylinderRef.current.scale.set(newScale, 1, newScale);

      if (hasAnomaly) {
        const pulse = 0.8 + 0.2 * Math.sin(time * 4);
        cylinderRef.current.scale.set(newScale * pulse, 1, newScale * pulse);
      }
    }

    if (glowRef.current) {
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      if (isSelected) {
        glowMaterial.opacity = 0.4 + 0.2 * Math.sin(time * 3);
        glowRef.current.visible = true;
      } else if (hovered) {
        glowMaterial.opacity = 0.2;
        glowRef.current.visible = true;
      } else {
        glowRef.current.visible = false;
      }
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelectedInstitutionId(isSelected ? null : institution.id);
  };

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group
      ref={groupRef}
      position={[institution.coordinateX, baseHeight / 2, institution.coordinateZ]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh ref={cylinderRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.8, baseHeight, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : hovered ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      <mesh ref={glowRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.5, baseHeight + 0.5, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>

      {hasAnomaly && (
        <mesh position={[0, baseHeight + 0.8, 0]}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={ANOMALY_COLORS.region_overlap} />
        </mesh>
      )}

      {(hovered || isSelected) && (
        <Html
          position={[0, baseHeight + 1.5, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div className="bg-[#0a1628]/95 backdrop-blur-sm border border-[#1e3a5f] rounded-lg px-3 py-2 min-w-[140px] shadow-lg">
            <div className="text-[11px] text-[#6b8bb0] mb-1 font-mono">{institution.region}</div>
            <div className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {institution.name}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color.getStyle() }}
              />
              <span className="text-xs text-[#8ba3c7]">
                风险得分: <span className="text-white font-mono">{riskScore?.score.toFixed(1) || '-'}</span>
              </span>
            </div>
            {hasAnomaly && (
              <div className="mt-1 pt-1 border-t border-[#1e3a5f]">
                <span className="text-[10px] text-[#ff0040] font-medium">
                  ⚠ 存在异常
                </span>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
