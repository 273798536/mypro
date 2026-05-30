import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, CatmullRomCurve3 } from 'three';
import type { LuggageRecord, ChuteModel, LuggageStatus } from '@/types';
import { createPathCurve, getProgressForPosition, getPositionOnPath } from '@/utils/pathUtils';
import { getAnomalyTypeColor } from '@/utils/anomalyDetector';

interface Luggage3DProps {
  luggage: LuggageRecord;
  chute: ChuteModel;
  isSelected: boolean;
  showLabel?: boolean;
  onClick?: () => void;
}

const getStatusColor = (status: LuggageStatus): string => {
  switch (status) {
    case 'height_mismatch':
      return getAnomalyTypeColor('height_mismatch');
    case 'speed_over':
      return getAnomalyTypeColor('speed_over');
    case 'stacked':
      return getAnomalyTypeColor('stacked');
    default:
      return '#22c55e';
  }
};

export function Luggage3D({ luggage, chute, isSelected, showLabel = true, onClick }: Luggage3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const curve = useMemo<CatmullRomCurve3>(() => createPathCurve(chute.pathPoints), [chute.pathPoints]);

  const position = useMemo<Vector3>(() => {
    const progress = getProgressForPosition(chute, luggage.position);
    return getPositionOnPath(curve, progress, 0.5 + luggage.height / 2);
  }, [curve, chute, luggage.position, luggage.height]);

  const color = useMemo(() => getStatusColor(luggage.status), [luggage.status]);
  const isAnomaly = luggage.status !== 'normal';

  useFrame((state) => {
    if (meshRef.current && isAnomaly) {
      meshRef.current.rotation.y += 0.02;
    }
  });

  const size = useMemo(() => {
    const baseSize = 0.3;
    const heightScale = Math.min(luggage.height / 0.3, 2);
    return {
      x: baseSize,
      y: baseSize * heightScale,
      z: baseSize,
    };
  }, [luggage.height]);

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial
          color={color}
          emissive={isAnomaly ? color : '#000'}
          emissiveIntensity={isAnomaly ? 0.4 : 0}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, size.y / 2 + 0.05, 0]}>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial color="#ffffff" side={2} transparent opacity={0.8} />
        </mesh>
      )}

      {isAnomaly && (
        <mesh position={[0, size.y / 2 + 0.3, 0]}>
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}

      {showLabel && isAnomaly && (
        <group position={[0, size.y + 0.5, 0]}>
          <mesh>
            <planeGeometry args={[1.5, 0.4]} />
            <meshBasicMaterial color="#000000" opacity={0.8} transparent />
          </mesh>
        </group>
      )}
    </group>
  );
}
