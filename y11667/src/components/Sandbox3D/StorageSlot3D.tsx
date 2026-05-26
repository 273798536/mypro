import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { StorageSlot } from '@/types';
import { STATUS_COLORS } from '@/data/warehouseConfig';
import { useWarehouseStore } from '@/store/useWarehouseStore';

interface StorageSlot3DProps {
  slot: StorageSlot;
  position: [number, number, number];
  isFiltered: boolean;
}

export function StorageSlot3D({ slot, position, isFiltered }: StorageSlot3DProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { selectedSlotId, setHoveredSlot, setSelectedSlot } = useWarehouseStore();

  const isSelected = selectedSlotId === slot.id;
  const baseColor = new Color(STATUS_COLORS[slot.status]);
  const displayColor = hovered || isSelected
    ? baseColor.clone().multiplyScalar(1.3)
    : baseColor;

  const opacity = isFiltered ? 1 : slot.receipts.length > 0 ? 0.3 : 0.1;

  useFrame((state) => {
    if (meshRef.current && (slot.status === 'overload' || slot.status === 'quality_fail')) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const height = Math.max(0.2, (slot.usedCapacity / slot.maxCapacity) * 1.2);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setHoveredSlot(slot.id);
        }}
        onPointerOut={() => {
          setHovered(false);
          setHoveredSlot(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSlot(isSelected ? null : slot.id);
        }}
      >
        <boxGeometry args={[0.9, height, 0.9]} />
        <meshStandardMaterial
          color={displayColor}
          transparent
          opacity={opacity}
          emissive={displayColor}
          emissiveIntensity={(hovered || isSelected) ? 0.3 : 0.1}
        />
      </mesh>

      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial color="#1E293B" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
