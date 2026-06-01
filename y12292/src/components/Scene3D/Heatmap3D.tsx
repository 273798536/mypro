
import { useMemo } from 'react';
import * as THREE from 'three';
import type { HeatmapCell, FloorData } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';

interface Heatmap3DProps {
  heatmapData: HeatmapCell[];
  floors: FloorData[];
}

export function Heatmap3D({ heatmapData, floors }: Heatmap3DProps) {
  const showHeatmap = useFilterStore(state => state.showHeatmap);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  
  if (!showHeatmap) return null;
  
  const getValueColor = (value: number) => {
    const normalized = Math.min(Math.max(value / 100, 0), 1);
    const hue = (1 - normalized) * 0.6;
    return new THREE.Color().setHSL(hue, 1, 0.5);
  };
  
  const floorHeights: Record<string, number> = {};
  floors.forEach(f => {
    floorHeights[f.id] = (f.level - 1) * 5 + 0.2;
  });
  
  const cellsByFloor = useMemo(() => {
    const grouped: Record<string, HeatmapCell[]> = {};
    heatmapData.forEach(cell => {
      if (!grouped[cell.floorId]) grouped[cell.floorId] = [];
      grouped[cell.floorId].push(cell);
    });
    return grouped;
  }, [heatmapData]);
  
  return (
    <group>
      {Object.entries(cellsByFloor).map(([floorId, cells]) => {
        if (!selectedFloors.includes(floorId)) return null;
        const height = floorHeights[floorId] || 0.2;
        
        return cells.map((cell, i) => {
          const color = getValueColor(cell.value);
          const opacity = 0.3 + (cell.value / 100) * 0.4;
          
          return (
            <mesh
              key={`${floorId}-${i}`}
              position={[cell.x, height, cell.y]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[4.5, 4.5]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        });
      })}
    </group>
  );
}

