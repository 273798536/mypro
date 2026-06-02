import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AirVent as AirVentType, ObjectType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { getStatusColor } from '../../utils/colors';

interface AirVentProps {
  vent: AirVentType;
  isAlarmFiltered: boolean;
  onObjectClick: (type: ObjectType, id: string, name: string) => void;
}

export function AirVent({ vent, isAlarmFiltered, onObjectClick }: AirVentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const { selectedObject } = useSceneStore();
  const isSelected = selectedObject?.id === vent.id;
  const statusColor = getStatusColor(vent.status);

  useFrame((state) => {
    if (fanRef.current && vent.airflow > 0) {
      fanRef.current.rotation.z += vent.airflow / 500;
    }
    if (groupRef.current && vent.status === 'critical') {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.15 + 0.85;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onObjectClick('vent', vent.id, vent.name);
  };

  const dimmed = isAlarmFiltered && !isSelected;
  const bodyOpacity = dimmed ? 0.35 : 1;
  const airflowPercent = vent.airflow / vent.maxAirflow;

  return (
    <group
      ref={groupRef}
      position={vent.position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.2, 1.5]} />
        <meshStandardMaterial
          color="#2a3a4a"
          metalness={0.7}
          roughness={0.3}
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          transparent={dimmed}
          opacity={bodyOpacity}
        />
      </mesh>

      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
        <meshStandardMaterial color="#1a2a3a" metalness={0.9} roughness={0.1} />
      </mesh>

      <group ref={fanRef as any}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[0, -0.2, 0]}>
            <boxGeometry args={[0.6, 0.02, 0.1]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={0.5 * airflowPercent}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.4, 1, 8, 1, true]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.15 * airflowPercent}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.8, 0.08, 0.2]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={vent.status === 'critical' ? 1 : 0.5}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.8, 0.4, 1.8]} />
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.15} wireframe />
        </mesh>
      )}
    </group>
  );
}
