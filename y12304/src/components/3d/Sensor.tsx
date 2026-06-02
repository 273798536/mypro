import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sensor as SensorType, ObjectType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { getStatusColor } from '../../utils/colors';

interface SensorProps {
  sensor: SensorType;
  isAlarmFiltered: boolean;
  onObjectClick: (type: ObjectType, id: string, name: string) => void;
}

export function Sensor({ sensor, isAlarmFiltered, onObjectClick }: SensorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { selectedObject } = useSceneStore();
  const isSelected = selectedObject?.id === sensor.id;
  const statusColor = getStatusColor(sensor.status);

  useFrame((state) => {
    if (groupRef.current && sensor.status === 'critical') {
      const pulse = Math.sin(state.clock.elapsedTime * 5) * 0.2 + 0.8;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onObjectClick('sensor', sensor.id, sensor.rackId);
  };

  const dimmed = isAlarmFiltered && !isSelected;
  const bodyOpacity = dimmed ? 0.35 : 1;

  return (
    <group
      ref={groupRef}
      position={sensor.position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={sensor.status === 'critical' ? 1 : 0.5}
          transparent={dimmed}
          opacity={bodyOpacity}
        />
      </mesh>

      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#2a3a4a" metalness={0.8} roughness={0.2} />
      </mesh>

      {sensor.status === 'critical' && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#FF4757" transparent opacity={0.2} />
        </mesh>
      )}

      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.3} wireframe />
        </mesh>
      )}
    </group>
  );
}
