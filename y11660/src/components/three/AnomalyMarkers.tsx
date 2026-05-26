import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProcessedDataPoint } from '@/types';
import { getAnomalySeverityColor } from '@/utils/anomalyDetector';

interface AnomalyMarkersProps {
  dataPoints: ProcessedDataPoint[];
  selectedPoint: ProcessedDataPoint | null;
}

export const AnomalyMarkers = ({
  dataPoints,
  selectedPoint,
}: AnomalyMarkersProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const anomalyPoints = dataPoints.filter((p) => p.anomalies.length > 0);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {anomalyPoints.map((point) => {
        const maxSeverity = point.anomalies.reduce(
          (max, a) => {
            const severityOrder = { warning: 1, error: 2, critical: 3 };
            return severityOrder[a.severity] > severityOrder[max.severity]
              ? a
              : max;
          },
          point.anomalies[0]
        );

        const color = getAnomalySeverityColor(maxSeverity.severity);
        const isSelected = selectedPoint?.id === point.id;
        const scale = isSelected ? 1.5 : 1;

        return (
          <group key={point.id} position={[point.x, point.y + 0.3, point.z]}>
            <mesh scale={[scale, scale, scale]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>

            <PulseRing color={color} />

            {maxSeverity.severity === 'critical' && (
              <mesh position={[0, 0.25, 0]}>
                <coneGeometry args={[0.08, 0.15, 6]} />
                <meshBasicMaterial color="#ef4444" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

const PulseRing = ({ color }: { color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      meshRef.current.scale.setScalar(scale);
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 - Math.sin(state.clock.elapsedTime * 3) * 0.25;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.15, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
};
