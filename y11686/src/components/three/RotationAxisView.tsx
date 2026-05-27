import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RotationAxis } from '@/types';

interface RotationAxisViewProps {
  axis: RotationAxis;
  isSelected: boolean;
  onClick: () => void;
}

export function RotationAxisView({ axis, isSelected, onClick }: RotationAxisViewProps) {
  const lineRef = useRef<any>(null);
  const cylinderRef = useRef<THREE.Mesh>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!lineRef.current) return;

    const start = new THREE.Vector3(...axis.startPoint);
    const end = new THREE.Vector3(...axis.endPoint);
    const direction = end.clone().sub(start).normalize();
    const length = start.distanceTo(end);
    const midPoint = start.clone().add(end).multiplyScalar(0.5);

    const points = [start, end];
    lineRef.current.geometry.setFromPoints(points);

    if (cylinderRef.current) {
      cylinderRef.current.position.copy(midPoint);
      cylinderRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      );
      cylinderRef.current.scale.y = length;
    }

    if (coneRef.current) {
      coneRef.current.position.copy(end);
      coneRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
      );
    }
  });

  if (!axis.visible) return null;

  const color = isSelected ? '#0ea5e9' : axis.color;

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <line ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial color={color} linewidth={isSelected ? 3 : 2} />
      </line>

      <mesh ref={cylinderRef}>
        <cylinderGeometry args={[isSelected ? 0.03 : 0.02, isSelected ? 0.03 : 0.02, 1, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      <mesh ref={coneRef}>
        <coneGeometry args={[isSelected ? 0.1 : 0.08, isSelected ? 0.2 : 0.15, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh position={axis.startPoint}>
        <sphereGeometry args={[isSelected ? 0.08 : 0.05, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}
