import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { DragControls } from '@react-three/drei';
import * as THREE from 'three';
import { Magnet as MagnetType } from '@/types';
import { useMagneticStore } from '@/store/magneticStore';

interface Magnet3DProps {
  magnet: MagnetType;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function Magnet3D({ magnet, isSelected, onSelect }: Magnet3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);
  const updateMagnetPosition = useMagneticStore(state => state.updateMagnetPosition);

  const poleDir = new THREE.Vector3(
    magnet.poleDirection.x,
    magnet.poleDirection.y,
    magnet.poleDirection.z
  ).normalize();

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), poleDir);

  useFrame((state) => {
    if (isSelected && groupRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.03;
      groupRef.current.scale.setScalar(scale);
    }
  });

  const handleDragEnd = () => {
    if (dragRef.current && groupRef.current) {
      const pos = groupRef.current.position;
      updateMagnetPosition(magnet.id, { x: pos.x, y: pos.y, z: pos.z });
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(magnet.id);
  };

  return (
    <DragControls ref={dragRef} onDragEnd={handleDragEnd}>
      <group
        ref={groupRef}
        position={[magnet.position.x, magnet.position.y, magnet.position.z]}
        quaternion={quaternion}
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
        <mesh position={[0.2, 0, 0]}>
          <boxGeometry args={[0.4, 0.15, 0.15]} />
          <meshStandardMaterial
            color={hovered || isSelected ? '#ff6b6b' : '#ff4757'}
            emissive={isSelected ? '#ff4757' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>
        
        <mesh position={[-0.2, 0, 0]}>
          <boxGeometry args={[0.4, 0.15, 0.15]} />
          <meshStandardMaterial
            color={hovered || isSelected ? '#6b8fff' : '#3742fa'}
            emissive={isSelected ? '#3742fa' : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>

        <mesh position={[0.4, 0, 0]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        <mesh position={[-0.4, 0, 0]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {(hovered || isSelected) && (
          <mesh>
            <boxGeometry args={[0.9, 0.2, 0.2]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.2} />
          </mesh>
        )}
      </group>
    </DragControls>
  );
}
