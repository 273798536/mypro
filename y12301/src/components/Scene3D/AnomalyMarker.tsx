import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AnomalyItem } from '../../types';

interface AnomalyMarkerProps {
  anomaly: AnomalyItem;
  isFocused: boolean;
  onClick: () => void;
}

export function AnomalyMarker({ anomaly, isFocused, onClick }: AnomalyMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const color = anomaly.severity === 'error' ? '#EF4444' : '#F59E0B';
  const scale = isFocused ? 1.5 : 1;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.position.y =
        (anomaly.position?.y || 30) + Math.sin(state.clock.elapsedTime * 2) * 2;
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 3) * 0.2
      );
    }
  });

  if (!anomaly.position) return null;

  return (
    <group
      ref={groupRef}
      position={[anomaly.position.x, anomaly.position.y, anomaly.position.z]}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2, 3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      <mesh>
        <coneGeometry args={[1.5, 4, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <sprite position={[0, 6, 0]} scale={[4, 2, 1]}>
        <spriteMaterial
          color={color}
          transparent
          opacity={isFocused ? 0.9 : 0.6}
        />
      </sprite>
    </group>
  );
}
