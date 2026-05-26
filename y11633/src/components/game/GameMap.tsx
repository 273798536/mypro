import { useMemo } from 'react';
import type { Robot, Shelf, Charger, Obstacle, Position } from '../../types';

interface GameMapProps {
  gridSize: number;
  robots: Robot[];
  shelves: Shelf[];
  chargers: Charger[];
  obstacles: Obstacle[];
  selectedRobotId: string | null;
  onCellClick?: (position: Position) => void;
}

export function GameMap({
  gridSize,
  robots,
  shelves,
  chargers,
  obstacles,
  selectedRobotId,
  onCellClick,
}: GameMapProps) {
  const cellSize = Math.min(50, Math.floor(500 / gridSize));

  const gridStyle = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
      gap: '1px',
    }),
    [gridSize, cellSize]
  );

  const getCellContent = (x: number, y: number) => {
    const robot = robots.find(r => r.position.x === x && r.position.y === y);
    if (robot) {
      const isSelected = robot.id === selectedRobotId;
      const batteryColor =
        robot.battery > 50
          ? 'bg-green-500'
          : robot.battery > 20
          ? 'bg-yellow-500'
          : 'bg-red-500';
      const statusEmoji = {
        idle: '🤖',
        moving: '🏃',
        charging: '⚡',
        picking: '📦',
        blocked: '🚫',
        low_battery: '🔋',
      }[robot.status];

      return (
        <div
          className={`relative w-full h-full flex items-center justify-center transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-400 ring-offset-1' : ''
          }`}
        >
          <span className="text-lg">{statusEmoji}</span>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${batteryColor}`} />
        </div>
      );
    }

    const shelf = shelves.find(s => s.position.x === x && s.position.y === y);
    if (shelf) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-amber-700 text-white text-xs font-bold rounded">
          {shelf.name}
        </div>
      );
    }

    const charger = chargers.find(c => c.position.x === x && c.position.y === y);
    if (charger) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-green-600 text-white rounded animate-pulse">
          ⚡
        </div>
      );
    }

    const obstacle = obstacles.find(o => o.position.x === x && o.position.y === y);
    if (obstacle) {
      const obstacleStyle = {
        wall: 'bg-gray-700',
        equipment: 'bg-purple-600',
        danger: 'bg-red-600',
      }[obstacle.type];
      return <div className={`w-full h-full ${obstacleStyle} rounded`} />;
    }

    return null;
  };

  const cells = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer relative ${
            (x + y) % 2 === 0 ? 'bg-opacity-60' : 'bg-opacity-80'
          }`}
          onClick={() => onCellClick?.({ x, y })}
        >
          {getCellContent(x, y)}
        </div>
      );
    }
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl shadow-2xl">
      <div style={gridStyle} className="border border-slate-600 rounded-lg overflow-hidden">
        {cells}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span>🤖</span>
          <span>机器人</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-700 rounded" />
          <span>货架</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded" />
          <span>充电桩</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 rounded" />
          <span>障碍物</span>
        </div>
      </div>
    </div>
  );
}
