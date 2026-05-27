import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Waypoint } from '../types';
import { latLngToVector3 } from '../utils/geo';

interface WaypointMarkerProps {
  waypoint: Waypoint;
  isSelected: boolean;
  onClick: () => void;
}

const WaypointMarker = ({ waypoint, isSelected, onClick }: WaypointMarkerProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const position = latLngToVector3(waypoint.lat, waypoint.lng, waypoint.alt, 2)
    .clone()
    .normalize()
    .multiplyScalar(2.1);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.2 : hovered ? 1.1 : 1;
      meshRef.current.scale.setScalar(scale);
      meshRef.current.rotation.y += 0.02;
    }
    if (ringRef.current) {
      const scale = isSelected ? 1.5 + Math.sin(state.clock.getElapsedTime() * 3) * 0.1 : 1;
      ringRef.current.scale.setScalar(scale);
      ringRef.current.rotation.y += 0.01;
    }
  });

  const color = waypoint.type === 'airport' ? '#10b981' : waypoint.type === 'alternate' ? '#f59e0b' : '#3b82f6';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      {isSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.12, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

export default WaypointMarker;
