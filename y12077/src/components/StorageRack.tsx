import { useMemo } from 'react';
import { StorageCell } from './StorageCell';
import { Rack, Location } from '../types';
import { useStore } from '../store/useStore';

interface StorageRackProps {
  rack: Rack;
  locations: Location[];
}

export function StorageRack({ rack, locations }: StorageRackProps) {
  const { selectedLocationId, conflicts, getLocationHeatMap } = useStore();

  const conflictMap = useMemo(() => {
    const map = new Map<string, string>();
    conflicts.forEach((c) => {
      if (!c.resolved) {
        map.set(c.locationId, c.type);
      }
    });
    return map;
  }, [conflicts]);

  const heatRange = useMemo(() => {
    const heatMap = getLocationHeatMap();
    const values = Array.from(heatMap.values());
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [getLocationHeatMap]);

  const cellSize: [number, number, number] = [
    rack.cellWidth,
    rack.cellHeight,
    rack.cellDepth,
  ];

  return (
    <group>
      <mesh
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[rack.columns * rack.cellWidth + 2, rack.rows * rack.cellDepth + 2]}
        />
        <meshStandardMaterial color="#1a1a2e" transparent opacity={0.5} />
      </mesh>

      <gridHelper
        args={[
          rack.columns * rack.cellWidth,
          rack.columns,
          '#333355',
          '#222244',
        ]}
        position={[0, 0.01, 0]}
        rotation={[0, 0, 0]}
      />

      {locations.map((location) => {
        const x =
          (location.col - rack.columns / 2 + 0.5) * rack.cellWidth;
        const y = (location.layer + 0.5) * rack.cellHeight;
        const z =
          (location.row - rack.rows / 2 + 0.5) * rack.cellDepth;

        return (
          <StorageCell
            key={location.id}
            location={location}
            position={[x, y, z]}
            size={cellSize}
            minHeat={heatRange.min}
            maxHeat={heatRange.max}
            conflictType={conflictMap.get(location.id)}
            isSelected={selectedLocationId === location.id}
          />
        );
      })}
    </group>
  );
}
