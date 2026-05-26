import { useState, useMemo } from 'react';
import { Box, Html } from '@react-three/drei';
import { useDataStore } from '../../stores/useDataStore';
import { useFilterStore } from '../../stores/useFilterStore';
import { getHeatColor } from '../../utils/heatEngine';
import type { Shelf } from '../../types';

interface ShelfItemProps {
  shelf: Shelf;
  isSelected: boolean;
  heatColor: string;
  onHover: (shelf: Shelf | null) => void;
  onClick: (shelf: Shelf) => void;
}

function ShelfItem({ shelf, isSelected, heatColor, onHover, onClick }: ShelfItemProps) {
  const [hovered, setHovered] = useState(false);

  const scale = isSelected || hovered ? 1.02 : 1;
  const displayColor = isSelected ? '#FBBF24' : hovered ? '#60A5FA' : heatColor;

  return (
    <group
      position={[
        shelf.position.x,
        shelf.position.y + shelf.dimensions.height / 2,
        shelf.position.z,
      ]}
    >
      <Box
        args={[
          shelf.dimensions.width * scale,
          shelf.dimensions.height * scale,
          shelf.dimensions.depth * scale,
        ]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(shelf);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(shelf);
        }}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={displayColor}
          metalness={0.3}
          roughness={0.6}
          clearcoat={0.1}
          emissive={displayColor}
          emissiveIntensity={isSelected ? 0.2 : hovered ? 0.1 : 0.05}
        />
      </Box>

      {(hovered || isSelected) && (
        <Html position={[0, shelf.dimensions.height / 2 + 0.5, 0]} center distanceFactor={10}>
          <div className="bg-gray-900 bg-opacity-90 text-white px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border border-gray-600">
            <div className="font-bold">{shelf.code}</div>
            <div className="text-yellow-400">热度: {shelf.heatValue}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

interface ShelfGroupProps {
  shelves: Shelf[];
}

export function ShelfGroup({ shelves }: ShelfGroupProps) {
  const { setHoverInfo, setSelectedShelfId, selectedShelfId } = useDataStore();
  const { heatThreshold } = useFilterStore();

  const heatColors = useMemo(() => {
    return shelves.map((shelf) =>
      getHeatColor(shelf.heatValue, heatThreshold.min, heatThreshold.max)
    );
  }, [shelves, heatThreshold]);

  const handleHover = (shelf: Shelf | null) => {
    if (shelf) {
      setHoverInfo({
        type: 'shelf',
        id: shelf.id,
        position: shelf.position,
        data: {
          code: shelf.code,
          heatValue: shelf.heatValue,
          source: shelf.source,
        },
      });
    } else {
      setHoverInfo(null);
    }
  };

  const handleClick = (shelf: Shelf) => {
    setSelectedShelfId(selectedShelfId === shelf.id ? null : shelf.id);
  };

  return (
    <group>
      {shelves.map((shelf, index) => (
        <ShelfItem
          key={shelf.id}
          shelf={shelf}
          isSelected={selectedShelfId === shelf.id}
          heatColor={heatColors[index]}
          onHover={handleHover}
          onClick={handleClick}
        />
      ))}
    </group>
  );
}
