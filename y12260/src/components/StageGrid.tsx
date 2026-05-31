import React, { useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { DEVICES } from '@/data/devices';
import { getDeviceOccupiedCells, isSamePosition, isPositionBlocked } from '@/utils/gridUtils';
import { cn } from '@/lib/utils';
import { Position } from '@/types';
import {
  Speaker,
  Mic2,
  SlidersHorizontal,
  Gauge,
  Box,
  MonitorSmartphone,
  X
} from 'lucide-react';
import { GameEngine } from '@/engine/GameEngine';

const iconMap: Record<string, React.ElementType> = {
  Speaker,
  Mic2,
  SlidersHorizontal,
  Gauge,
  Box,
  MonitorSmartphone
};

interface StageGridProps {
  reviewState?: any;
}

export const StageGrid = ({ reviewState }: StageGridProps) => {
  const {
    level,
    placedDevices,
    cables,
    walkPaths,
    conflicts,
    currentTool,
    selectedDevice,
    cableStart,
    walkPoints,
    handleGridClick,
    hoveredCell,
    setHoveredCell,
    status
  } = useGameStore();

  const gridRef = useRef<HTMLDivElement>(null);
  const cellSize = 80;
  const gap = 2;

  const displayState = reviewState || useGameStore.getState();
  const displayDevices = reviewState ? reviewState.placedDevices : placedDevices;
  const displayCables = reviewState ? reviewState.cables : cables;
  const displayPaths = reviewState ? reviewState.walkPaths : walkPaths;
  const displayConflicts = reviewState ? reviewState.conflicts : conflicts;

  const getCellCenter = (pos: Position) => ({
    x: pos.x * (cellSize + gap) + cellSize / 2,
    y: pos.y * (cellSize + gap) + cellSize / 2
  });

  const renderCablePath = (points: Position[], color: string, isPreview = false) => {
    if (points.length < 2) return null;
    
    const pathData = points.map((p, i) => {
      const center = getCellCenter(p);
      return `${i === 0 ? 'M' : 'L'} ${center.x} ${center.y}`;
    }).join(' ');

    return (
      <g key={`cable-preview-${Math.random()}`}>
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={isPreview ? 3 : 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(isPreview && 'animate-pulse')}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {points.map((p, i) => (
          <circle
            key={`node-${i}`}
            cx={getCellCenter(p).x}
            cy={getCellCenter(p).y}
            r={4}
            fill={color}
            className={cn(isPreview && 'animate-pulse')}
          />
        ))}
      </g>
    );
  };

  const renderWalkPath = (points: Position[], color: string, musician: string, isPreview = false) => {
    if (points.length < 2) return null;
    
    const pathData = points.map((p, i) => {
      const center = getCellCenter(p);
      return `${i === 0 ? 'M' : 'L'} ${center.x} ${center.y}`;
    }).join(' ');

    return (
      <g key={`path-${musician}-${Math.random()}`}>
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isPreview ? '8 4' : '12 6'}
          className={cn(isPreview && 'animate-pulse')}
          style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
        />
        <circle
          cx={getCellCenter(points[0]).x}
          cy={getCellCenter(points[0]).y}
          r={8}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={getCellCenter(points[0]).x}
          y={getCellCenter(points[0]).y + 4}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontWeight="bold"
        >
          起
        </text>
        <circle
          cx={getCellCenter(points[points.length - 1]).x}
          cy={getCellCenter(points[points.length - 1]).y}
          r={8}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={getCellCenter(points[points.length - 1]).x}
          y={getCellCenter(points[points.length - 1]).y + 4}
          textAnchor="middle"
          fill="white"
          fontSize={10}
          fontWeight="bold"
        >
          终
        </text>
      </g>
    );
  };

  const getConflictPositions = () => {
    const positions = new Set<string>();
    displayConflicts.forEach(c => {
      c.positions.forEach(p => positions.add(`${p.x},${p.y}`));
    });
    return Array.from(positions).map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    });
  };

  const conflictPositions = getConflictPositions();

  const canPlaceAtHover = selectedDevice && hoveredCell
    ? GameEngine.canPlaceDevice(displayState, hoveredCell, selectedDevice).canPlace
    : true;

  const renderPreview = () => {
    if (!selectedDevice || !hoveredCell || currentTool !== 'place') return null;
    
    const device = DEVICES[selectedDevice];
    const cells = getDeviceOccupiedCells(hoveredCell, selectedDevice);
    const width = device.size.width * (cellSize + gap) - gap;
    const height = device.size.height * (cellSize + gap) - gap;

    return (
      <div
        className="absolute pointer-events-none transition-all duration-75"
        style={{
          left: hoveredCell.x * (cellSize + gap),
          top: hoveredCell.y * (cellSize + gap),
          width,
          height,
          opacity: canPlaceAtHover ? 0.7 : 0.4
        }}
      >
        <div
          className={cn(
            'w-full h-full rounded-lg border-2 border-dashed flex items-center justify-center',
            canPlaceAtHover ? 'border-purple-400 bg-purple-500/20' : 'border-red-400 bg-red-500/20'
          )}
        >
          {React.createElement(iconMap[device.icon] || Box, {
            size: 24,
            className: canPlaceAtHover ? 'text-purple-400' : 'text-red-400'
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-auto">
      <div className="relative">
        <div className="absolute -top-6 left-0 right-0 flex justify-between px-2">
          {Array.from({ length: level.gridSize.width }).map((_, i) => (
            <div
              key={`col-${i}`}
              className="w-[80px] text-center text-xs text-slate-500 font-mono"
            >
              {i}
            </div>
          ))}
        </div>

        <div className="flex">
          <div className="flex flex-col justify-between py-2 pr-2">
            {Array.from({ length: level.gridSize.height }).map((_, i) => (
              <div
                key={`row-${i}`}
                className="h-[80px] flex items-center text-xs text-slate-500 font-mono"
              >
                {i}
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            className="relative rounded-xl overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${level.gridSize.width}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${level.gridSize.height}, ${cellSize}px)`,
              gap: `${gap}px`,
              padding: `${gap}px`,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          >
            {Array.from({ length: level.gridSize.height }).map((_, y) =>
              Array.from({ length: level.gridSize.width }).map((_, x) => {
                const pos = { x, y };
                const isBlocked = isPositionBlocked(pos, level.blockedAreas);
                const isConflict = conflictPositions.some(p => isSamePosition(p, pos));
                const isCableStart = cableStart && isSamePosition(cableStart, pos);
                const isWalkPoint = walkPoints.some(p => isSamePosition(p, pos));
                const isHovered = hoveredCell && isSamePosition(hoveredCell, pos);

                return (
                  <div
                    key={`${x}-${y}`}
                    className={cn(
                      'relative rounded cursor-pointer transition-all duration-150',
                      isBlocked
                        ? 'bg-red-900/30 border border-red-500/30'
                        : isConflict
                        ? 'bg-red-500/20 border border-red-500/50 animate-pulse'
                        : isCableStart
                        ? 'bg-cyan-500/30 border-2 border-cyan-400'
                        : isWalkPoint
                        ? 'bg-yellow-500/20 border border-yellow-500/50'
                        : isHovered
                        ? 'bg-slate-700/50 border border-slate-500/50'
                        : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/30',
                      currentTool === 'place' && selectedDevice && isHovered && canPlaceAtHover && 'ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-900'
                    )}
                    onClick={() => !reviewState && status !== 'finished' && handleGridClick(pos)}
                    onMouseEnter={() => !reviewState && setHoveredCell(pos)}
                    onMouseLeave={() => !reviewState && setHoveredCell(null)}
                  >
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X size={20} className="text-red-500/50" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {displayDevices.map((device) => {
              const deviceInfo = DEVICES[device.deviceType];
              const width = deviceInfo.size.width * (cellSize + gap) - gap;
              const height = deviceInfo.size.height * (cellSize + gap) - gap;
              const Icon = iconMap[deviceInfo.icon] || Box;

              return (
                <div
                  key={device.id}
                  className="absolute transition-all duration-300 group"
                  style={{
                    left: device.position.x * (cellSize + gap),
                    top: device.position.y * (cellSize + gap),
                    width,
                    height,
                    zIndex: 10
                  }}
                >
                  <div
                    className="w-full h-full rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      backgroundColor: deviceInfo.color + '25',
                      borderColor: deviceInfo.color + '80',
                      boxShadow: `0 0 20px ${deviceInfo.color}30`
                    }}
                  >
                    <Icon size={28} style={{ color: deviceInfo.color }} />
                    <span
                      className="text-xs mt-1 font-medium truncate max-w-full px-2"
                      style={{ color: deviceInfo.color }}
                    >
                      {device.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {renderPreview()}
          </div>
        </div>

        <svg
          className="absolute top-2 left-2 pointer-events-none"
          style={{
            width: level.gridSize.width * (cellSize + gap) + gap,
            height: level.gridSize.height * (cellSize + gap) + gap,
            zIndex: 20
          }}
        >
          {displayCables.map((cable) => renderCablePath(cable.points, cable.color))}
          
          {cableStart && currentTool === 'cable' && hoveredCell && !isSamePosition(cableStart, hoveredCell) && (
            renderCablePath([cableStart, hoveredCell], '#06B6D4', true)
          )}

          {displayPaths.map((path) => renderWalkPath(path.points, path.color, path.musician))}

          {walkPoints.length > 0 && currentTool === 'walk' && (
            renderWalkPath(walkPoints, '#EAB308', 'preview', true)
          )}

          {displayConflicts.map((conflict, idx) =>
            conflict.positions.map((pos, pIdx) => (
              <g key={`${conflict.id}-${pIdx}`}>
                <circle
                  cx={getCellCenter(pos).x}
                  cy={getCellCenter(pos).y}
                  r={16}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth={2}
                  className="animate-ping"
                  style={{ transformOrigin: `${getCellCenter(pos).x}px ${getCellCenter(pos).y}px` }}
                />
                <circle
                  cx={getCellCenter(pos).x}
                  cy={getCellCenter(pos).y}
                  r={12}
                  fill="#EF4444"
                  fillOpacity={0.3}
                  stroke="#EF4444"
                  strokeWidth={2}
                />
                <text
                  x={getCellCenter(pos).x}
                  y={getCellCenter(pos).y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize={10}
                  fontWeight="bold"
                >
                  !
                </text>
              </g>
            ))
          )}
        </svg>

        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500/30 border border-purple-500/50 rounded" /> 设备
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 bg-cyan-500 rounded" /> 线缆
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-yellow-500 rounded" style={{ borderStyle: 'dashed' }} /> 走位
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500/30 border border-red-500/50 rounded" /> 冲突
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-900/30 border border-red-500/30 rounded" /> 禁放
          </span>
        </div>
      </div>
    </div>
  );
};
