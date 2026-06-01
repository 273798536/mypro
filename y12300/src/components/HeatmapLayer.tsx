import { useMemo } from 'react';
import * as THREE from 'three';
import { floors, halls, visitorRecords } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function getHeatColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(ratio, 1.5));
  if (clamped <= 0.5) {
    const t = clamped / 0.5;
    const r = Math.round(33 + (255 - 33) * t);
    const g = Math.round(150 + (235 - 150) * t);
    const b = Math.round(243 + (59 - 243) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = Math.min((clamped - 0.5) / 0.5, 1);
    const r = Math.round(255 + (255 - 255) * t);
    const g = Math.round(235 + (87 - 235) * t);
    const b = Math.round(59 + (34 - 59) * t);
    return `rgb(${r},${g},${b})`;
  }
}

export default function HeatmapLayer() {
  const { selectedFloor, selectedTimeRange, heatmapOpacity } =
    useMuseumStore();

  const floorHalls = useMemo(
    () => halls.filter((h) => h.floorId === selectedFloor),
    [selectedFloor]
  );

  const hallHeatData = useMemo(() => {
    return floorHalls.map((hall) => {
      const [start, end] = selectedTimeRange;
      const total = visitorRecords
        .filter(
          (r) => r.hallId === hall.id && r.timestamp >= start && r.timestamp <= end
        )
        .reduce((sum, r) => sum + r.count, 0);
      const ratio = hall.capacity > 0 ? total / hall.capacity : 0;
      const color = getHeatColor(ratio);
      const floorElevation =
        floors.find((f) => f.id === hall.floorId)?.elevation ?? 0;
      const y = floorElevation + hall.geometry.height + 0.05;
      return { hall, color, y };
    });
  }, [floorHalls, selectedTimeRange]);

  return (
    <group>
      {hallHeatData.map(({ hall, color, y }) => (
        <mesh
          key={hall.id}
          position={[
            hall.geometry.x + hall.geometry.width / 2,
            y,
            hall.geometry.z + hall.geometry.depth / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[hall.geometry.width, hall.geometry.depth]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={heatmapOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
