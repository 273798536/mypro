import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export default function MeasurementPoints() {
  const points = useStore((state) => state.measurementPoints);
  const selectedId = useStore((state) => state.selectedPointId);
  const setSelected = useStore((state) => state.setSelectedPointId);
  const animationSpeed = useStore((state) => state.animationSpeed);

  return (
    <group>
      {points.map((point) => (
        <MeasurementPoint
          key={point.id}
          point={point}
          isSelected={point.id === selectedId}
          onSelect={() => setSelected(point.id === selectedId ? null : point.id)}
          animationSpeed={animationSpeed}
        />
      ))}
    </group>
  );
}

interface MeasurementPointProps {
  point: { id: string; name: string; x: number; y: number; z: number };
  isSelected: boolean;
  onSelect: () => void;
  animationSpeed: number;
}

function MeasurementPoint({ point, isSelected, onSelect, animationSpeed }: MeasurementPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * animationSpeed * 6) * 0.15);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * animationSpeed * 2;
    }
  });

  return (
    <group position={[point.x, point.y, point.z]} onClick={onSelect}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isSelected ? 0.12 : 0.08, 12, 12]} />
        <meshStandardMaterial
          color={isSelected ? '#00ff88' : '#00d4ff'}
          emissive={isSelected ? '#00ff88' : '#00d4ff'}
          emissiveIntensity={isSelected ? 0.6 : 0.3}
        />
      </mesh>
      
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.2, 32]} />
        <meshBasicMaterial
          color={isSelected ? '#00ff88' : '#00d4ff'}
          transparent
          opacity={isSelected ? 0.8 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {isSelected && (
        <pointLight color="#00ff88" intensity={0.8} distance={2} />
      )}
    </group>
  );
}
