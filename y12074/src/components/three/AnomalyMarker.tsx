import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { AnomalyEvent, ChuteModel } from '@/types';
import { createPathCurve, getProgressForPosition, getPositionOnPath } from '@/utils/pathUtils';
import { getAnomalyTypeColor, getAnomalyTypeLabel, getSeverityLabel } from '@/utils/anomalyDetector';

interface AnomalyMarkerProps {
  anomaly: AnomalyEvent;
  chute: ChuteModel;
  isSelected: boolean;
  showLabel?: boolean;
  onClick?: () => void;
}

export function AnomalyMarker({ anomaly, chute, isSelected, showLabel = true, onClick }: AnomalyMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const curve = useMemo(() => createPathCurve(chute.pathPoints), [chute.pathPoints]);

  const position = useMemo(() => {
    const progress = getProgressForPosition(chute, anomaly.position);
    return getPositionOnPath(curve, progress, 1.0);
  }, [curve, chute, anomaly.position]);

  const color = useMemo(() => getAnomalyTypeColor(anomaly.type), [anomaly.type]);
  const pulseScale = useRef(1);

  useFrame((state, delta) => {
    if (groupRef.current) {
      pulseScale.current = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      groupRef.current.scale.setScalar(pulseScale.current);
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const markerSize = useMemo(() => {
    switch (anomaly.severity) {
      case 'high':
        return 0.4;
      case 'medium':
        return 0.3;
      default:
        return 0.25;
    }
  }, [anomaly.severity]);

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
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
      <mesh>
        <ringGeometry args={[markerSize * 0.7, markerSize, 32]} />
        <meshBasicMaterial
          color={color}
          side={2}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[markerSize * 0.5, markerSize * 0.65, 32]} />
        <meshBasicMaterial
          color={color}
          side={2}
          transparent
          opacity={0.6}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[markerSize * 0.15, markerSize * 0.5, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {isSelected && (
        <mesh>
          <ringGeometry args={[markerSize * 1.2, markerSize * 1.35, 32]} />
          <meshBasicMaterial color="#ffffff" side={2} transparent opacity={0.6} />
        </mesh>
      )}

      {(hovered || isSelected) && showLabel && (
        <Html
          position={[0, markerSize + 0.5, 0]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
        >
          <div className="bg-gray-900/95 text-white px-3 py-2 rounded text-xs whitespace-nowrap border border-gray-700 shadow-lg">
            <div className="font-bold" style={{ color }}>
              {getAnomalyTypeLabel(anomaly.type)}
            </div>
            <div className="text-gray-300 mt-1">
              位置: {anomaly.position.toFixed(2)}m
            </div>
            <div className="text-gray-300">
              标准: {anomaly.expectedValue} | 实际: {anomaly.actualValue}
            </div>
            <div className="text-gray-400 mt-1">
              严重程度: {getSeverityLabel(anomaly.severity)}
            </div>
            <div className="text-gray-500 text-[10px] mt-1">
              {anomaly.reviewed ? '✓ 已复核' : '⚠ 待复核'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
