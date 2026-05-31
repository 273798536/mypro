import React, { useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useCargoStore } from '@/store/useCargoStore';
import { useStabilityStore } from '@/store/useStabilityStore';
import { DataLabel } from '@/components/common/DataLabel';
import { AlertTriangle } from 'lucide-react';

export const CargoGrid: React.FC = () => {
  const { grid, cells, selectedCellId, setSelectedCell, getCellById } = useCargoStore();
  const showGrid = useStabilityStore((state) => state.showGrid);
  const overloadCells = useStabilityStore((state) => state.result?.overloadCells || []);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const cellInstances = useMemo(() => {
    return cells.map((cell) => {
      const x = grid.gridConfig.origin.x + cell.col * grid.cellWidth + grid.cellWidth / 2;
      const z = grid.gridConfig.origin.y + cell.row * grid.cellLength + grid.cellLength / 2;
      const y = grid.gridConfig.origin.z + cell.layer * grid.cellHeight + grid.cellHeight / 2;

      let cellColor = '#475569';
      let borderColor = '#64748B';
      let opacity = 0.3;

      if (cell.status === 'loaded') {
        const colors: Record<string, string> = {
          '铁矿石': '#8B4513',
          '煤炭': '#2C2C2C',
          '谷物': '#F4D03F',
          '钢材': '#707B7C',
          '集装箱': '#3498DB',
        };
        cellColor = colors[cell.cargoName] || '#475569';
        opacity = 0.8;
      } else if (cell.status === 'warning') {
        cellColor = '#F59E0B';
        opacity = 0.7;
        borderColor = '#FBBF24';
      } else if (cell.status === 'overload') {
        cellColor = '#EF4444';
        opacity = 0.7;
        borderColor = '#F87171';
      }

      if (selectedCellId === cell.id) {
        borderColor = '#3B82F6';
      }
      if (hoveredCell === cell.id) {
        opacity = Math.min(opacity + 0.2, 1);
      }

      const isOverload = overloadCells.includes(cell.id);

      return {
        cell,
        position: [x, y, z] as [number, number, number],
        cellColor,
        borderColor,
        opacity,
        isOverload,
      };
    });
  }, [cells, grid, selectedCellId, hoveredCell, overloadCells]);

  if (!showGrid) return null;

  return (
    <group>
      {cellInstances.map(({ cell, position, cellColor, borderColor, opacity, isOverload }) => (
        <group
          key={cell.id}
          position={position}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCell(selectedCellId === cell.id ? null : cell.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredCell(cell.id);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHoveredCell(null);
            document.body.style.cursor = 'auto';
          }}
        >
          <mesh>
            <boxGeometry args={[grid.cellWidth * 0.95, grid.cellHeight * 0.95, grid.cellLength * 0.95]} />
            <meshStandardMaterial
              color={cellColor}
              transparent
              opacity={opacity}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>

          <lineSegments>
            <edgesGeometry args={[
              new THREE.BoxGeometry(grid.cellWidth * 0.98, grid.cellHeight * 0.98, grid.cellLength * 0.98)
            ]} />
            <lineBasicMaterial color={borderColor} linewidth={isOverload ? 3 : 1} />
          </lineSegments>

          {isOverload && (
            <mesh position={[0, grid.cellHeight / 2 + 0.5, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
          )}

          {(hoveredCell === cell.id || selectedCellId === cell.id) && cell.currentLoad > 0 && (
            <Html
              position={[0, grid.cellHeight / 2 + 1.5, 0]}
              center
              distanceFactor={10}
              zIndexRange={[100, 0]}
            >
              <div className="flex flex-col items-center gap-1">
                {isOverload && (
                  <div className="flex items-center gap-1 text-red-400 text-xs font-bold">
                    <AlertTriangle size={12} />
                    <span>超载 {cell.currentLoad - cell.maxCapacity}t</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <DataLabel
                    value={cell.currentLoad}
                    unit="t"
                    label="载重"
                    status={isOverload ? 'danger' : cell.status === 'warning' ? 'warning' : 'normal'}
                  />
                  <DataLabel
                    value={cell.maxCapacity}
                    unit="t"
                    label="上限"
                  />
                </div>
                {cell.cargoName && (
                  <span className="text-xs text-slate-300 font-medium bg-slate-800/80 px-2 py-0.5 rounded">
                    {cell.cargoName}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">
                  {cell.id}
                </span>
              </div>
            </Html>
          )}
        </group>
      ))}

      <lineSegments position={[
        grid.gridConfig.origin.x + (grid.cols * grid.cellWidth) / 2,
        grid.gridConfig.origin.z + (grid.layers * grid.cellHeight) / 2,
        grid.gridConfig.origin.y + (grid.rows * grid.cellLength) / 2,
      ]}>
        <edgesGeometry args={[
          new THREE.BoxGeometry(
            grid.cols * grid.cellWidth,
            grid.layers * grid.cellHeight,
            grid.rows * grid.cellLength
          )
        ]} />
        <lineBasicMaterial color="#475569" linewidth={1} />
      </lineSegments>
    </group>
  );
};
