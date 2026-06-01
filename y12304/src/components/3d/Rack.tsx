import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Rack as RackType } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { getTemperatureColor, getStatusColor } from '../../utils/colors';

interface RackProps {
  rack: RackType;
}

export function Rack({ rack }: RackProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedObject, setSelectedObject, setDetailModalOpen } = useSceneStore();
  const isSelected = selectedObject?.id === rack.id;

  const scale = hovered || isSelected ? 1.05 : 1;
  const temperatureColor = getTemperatureColor(rack.temperature);
  const statusColor = getStatusColor(rack.status);

  useFrame((state) => {
    if (groupRef.current && rack.status === 'critical') {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      groupRef.current.scale.setScalar(scale * pulse);
    } else if (groupRef.current) {
      groupRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedObject({ type: 'rack', id: rack.id, name: rack.name });
    setDetailModalOpen(true);
  };

  return (
    <group
      ref={groupRef}
      position={rack.position}
      onClick={handleClick}
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
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[2, 4, 1]} />
        <meshStandardMaterial
          color="#1a2a3a"
          metalness={0.8}
          roughness={0.2}
          emissive={isSelected ? '#00D4FF' : hovered ? '#1a3a5a' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.45, 0.51]}>
          <boxGeometry args={[1.8, 0.35, 0.02]} />
          <meshStandardMaterial
            color={i < 2 ? temperatureColor : '#2a3a4a'}
            metalness={0.5}
            roughness={0.3}
            emissive={i < 2 ? temperatureColor : '#000000'}
            emissiveIntensity={i < 2 ? 0.3 : 0}
          />
        </mesh>
      ))}

      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[1.5, 0.1, 0.6]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={rack.status === 'critical' ? 0.8 : 0.4}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[2.2, 4.2, 1.2]} />
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.1} wireframe />
        </mesh>
      )}
    </group>
  );
}
