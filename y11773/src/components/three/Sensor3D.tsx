import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { intensityToColor } from '../../utils/physics';
import { useAppStore } from '../../store/useAppStore';
import { Draggable } from './Draggable';

interface Sensor3DProps {
  position: [number, number, number];
  measuredIntensity: number;
  status: 'normal' | 'warning' | 'error';
  onPositionChange: (position: [number, number, number]) => void;
}

export function Sensor3D({
  position,
  measuredIntensity,
  status,
  onPositionChange,
}: Sensor3DProps) {
  const meshRef = useRef<Mesh>(null);
  const maxFieldIntensity = useAppStore((state) => state.maxFieldIntensity);

  const [r, g, b] = intensityToColor(measuredIntensity, maxFieldIntensity);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'error':
        return '#ff1744';
      case 'warning':
        return '#ffd700';
      default:
        return '#00e676';
    }
  }, [status]);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      meshRef.current.rotation.y = time * 0.3;
      const bob = Math.sin(time * 2) * 0.05;
      meshRef.current.position.y = position[1] + bob;
    }
  });

  return (
    <Draggable position={position} onPositionChange={onPositionChange}>
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial
          color={`rgb(${r}, ${g}, ${b})`}
          emissive={statusColor}
          emissiveIntensity={status === 'error' ? 2 : status === 'warning' ? 1 : 0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[position[0], position[1] + 0.35, position[2]]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight
        position={[position[0], position[1] + 0.35, position[2]]}
        color={statusColor}
        intensity={status === 'error' ? 5 : status === 'warning' ? 3 : 1}
        distance={3}
      />
    </Draggable>
  );
}
