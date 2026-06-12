import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { buoys } from '@/data/mockData';
import { useAppStore } from '@/store/appStore';

interface BuoyMarkerProps {
  buoy: (typeof buoys)[0];
  isSelected: boolean;
  onClick: () => void;
}

function BuoyMarker({ buoy, isSelected, onClick }: BuoyMarkerProps) {
  const meshRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);

  const statusColors = {
    online: '#00D4AA',
    offline: '#FF6B35',
    maintenance: '#F59E0B',
  };

  const color = statusColors[buoy.status as keyof typeof statusColors];

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = 0.5 + Math.sin(time * 1.2 + buoy.position[2]) * 0.15;
      meshRef.current.rotation.y = Math.sin(time * 0.3) * 0.1;
    }
    if (lightRef.current && buoy.status !== 'offline') {
      lightRef.current.intensity = 0.8 + Math.sin(time * 3) * 0.4;
    }
  });

  return (
    <group
      ref={meshRef}
      position={buoy.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
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
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.3, 16]} />
        <meshStandardMaterial color="#1e3a5f" metalness={0.6} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.3, 16]} />
        <meshStandardMaterial color="#2d5a8a" metalness={0.5} roughness={0.5} />
      </mesh>

      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={buoy.status === 'offline' ? 0.1 : isSelected ? 1.5 : 0.8}
        />
      </mesh>

      {buoy.status !== 'offline' && (
        <pointLight
          ref={lightRef}
          position={[0, 0.45, 0]}
          color={color}
          intensity={0.8}
          distance={3}
        />
      )}

      {buoy.status === 'offline' && (
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#FF6B35" transparent opacity={0.8} />
        </mesh>
      )}

      {isSelected && (
        <mesh position={[0, 0.45, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export function Buoys() {
  const { selection, selectBuoy } = useAppStore();
  const { selectedBuoyId } = selection;

  return (
    <group>
      {buoys.map((buoy) => (
        <BuoyMarker
          key={buoy.id}
          buoy={buoy}
          isSelected={selectedBuoyId === buoy.id}
          onClick={() => selectBuoy(selectedBuoyId === buoy.id ? null : buoy.id)}
        />
      ))}
    </group>
  );
}
