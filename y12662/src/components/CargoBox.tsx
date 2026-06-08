import { useRef, useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { MeasurementRecord, Anomaly } from '@/types';

interface CargoBoxProps {
  record: MeasurementRecord;
  anomalies: Anomaly[];
  isSelected: boolean;
  cutX: number | null;
  cutY: number | null;
  cutZ: number | null;
  onClick: () => void;
}

export function CargoBox({
  record,
  anomalies,
  isSelected,
  cutX,
  cutY,
  cutZ,
  onClick,
}: CargoBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const hasAnomaly = anomalies.length > 0;
  const hasCritical = anomalies.some((a) => a.severity === 'CRITICAL');
  const hasPending = anomalies.some((a) => a.status === 'PENDING');

  const baseColor = useMemo(() => {
    if (isSelected) return '#f59e0b';
    if (hasCritical && hasPending) return '#ef4444';
    if (hasAnomaly && hasPending) return '#f97316';
    if (hasAnomaly) return '#10b981';
    return '#3b82f6';
  }, [isSelected, hasAnomaly, hasCritical, hasPending]);

  const opacity = hovered || isSelected ? 0.95 : 0.8;

  const clipPlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    if (cutX !== null)
      planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), cutX));
    if (cutY !== null)
      planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), cutY));
    if (cutZ !== null)
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), cutZ));
    return planes;
  }, [cutX, cutY, cutZ]);

  const size = {
    x: Math.max(0.8, Math.min(record.volume / 5, 2)),
    y: Math.max(0.6, Math.min(record.weight / 15000, 1.5)),
    z: Math.max(0.8, Math.min(record.volume / 6, 2)),
  };

  return (
    <group position={[record.positionX, record.positionY, record.positionZ]}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.1}
          clippingPlanes={clipPlanes}
          clipShadows
        />
      </mesh>
      {(hovered || isSelected) && (
        <lineSegments>
          <edgesGeometry
            args={[
              new THREE.BoxGeometry(size.x + 0.02, size.y + 0.02, size.z + 0.02),
            ]}
          />
          <lineBasicMaterial color={isSelected ? '#fbbf24' : '#ffffff'} />
        </lineSegments>
      )}
    </group>
  );
}
