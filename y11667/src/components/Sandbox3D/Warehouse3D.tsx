import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { StorageSlot3D } from './StorageSlot3D';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { WAREHOUSES } from '@/data/warehouseConfig';
import { StorageSlot } from '@/types';

interface WarehouseProps {
  warehouseId: string;
  slots: StorageSlot[];
  filteredSlotIds: Set<string>;
  offsetX: number;
}

function WarehouseBuilding({ warehouseId, slots, filteredSlotIds, offsetX }: WarehouseProps) {
  const warehouse = WAREHOUSES.find((w) => w.id === warehouseId);
  if (!warehouse) return null;

  const warehouseSlots = slots.filter((s) => s.warehouseId === warehouseId);

  return (
    <group position={[offsetX, 0, 0]}>
      <mesh position={[warehouse.cols / 2 - 0.5, -0.1, warehouse.rows / 2 - 0.5]}>
        <boxGeometry args={[warehouse.cols + 1, 0.2, warehouse.rows + 1]} />
        <meshStandardMaterial color="#1E293B" />
      </mesh>

      {warehouseSlots.map((slot) => {
        const x = slot.col;
        const y = slot.level * 1.5;
        const z = slot.row;
        const isFiltered = filteredSlotIds.has(slot.id);

        return (
          <StorageSlot3D
            key={slot.id}
            slot={slot}
            position={[x, y, z]}
            isFiltered={isFiltered}
          />
        );
      })}

      <mesh
        position={[warehouse.cols / 2 - 0.5, warehouse.levels * 1.5 / 2, -0.5]}
      >
        <boxGeometry args={[warehouse.cols + 1, warehouse.levels * 1.5, 0.2]} />
        <meshStandardMaterial color="#334155" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export function Warehouse3D() {
  const { slots, getFilteredSlots } = useWarehouseStore();

  const filteredSlotIds = useMemo(() => {
    const filtered = getFilteredSlots();
    return new Set(filtered.map((s) => s.id));
  }, [getFilteredSlots, slots]);

  return (
    <Canvas
      camera={{ position: [15, 20, 25], fov: 50 }}
      style={{ background: '#0F172A' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      <fog attach="fog" args={['#0F172A', 30, 80]} />

      <Grid
        args={[100, 100]}
        position={[10, -0.2, 10]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />

      {WAREHOUSES.map((wh, index) => (
        <WarehouseBuilding
          key={wh.id}
          warehouseId={wh.id}
          slots={slots}
          filteredSlotIds={filteredSlotIds}
          offsetX={index * 20}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
