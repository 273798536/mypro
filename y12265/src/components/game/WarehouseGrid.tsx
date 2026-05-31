import React from 'react';
import { Scene, GameState, Position, Robot } from '../../types/game';

interface WarehouseGridProps {
  scene: Scene;
  gameState?: GameState | null;
  onCellClick?: (position: Position) => void;
  highlightPath?: Position[];
  selectedRobotId?: string;
}

const CELL_SIZE = 50;

const WarehouseGrid: React.FC<WarehouseGridProps> = ({
  scene,
  gameState,
  onCellClick,
  highlightPath,
  selectedRobotId,
}) => {
  const robots = gameState?.robots || scene.robots;

  const getRobotColor = (robot: Robot) => {
    if (robot.id === selectedRobotId) return '#ff6b35';
    switch (robot.status) {
      case 'charging': return '#22c55e';
      case 'low-battery': return '#eab308';
      case 'delivering': return '#3b82f6';
      case 'moving': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getObstacleColor = (type: string) => {
    switch (type) {
      case 'charging': return '#22c55e';
      case 'wall': return '#374151';
      case 'restricted': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="relative bg-slate-900 rounded-lg p-4 overflow-auto">
      <svg
        width={scene.gridWidth * CELL_SIZE + 2}
        height={scene.gridHeight * CELL_SIZE + 2}
        className="border border-slate-700"
      >
        {Array.from({ length: scene.gridWidth }).map((_, x) =>
          Array.from({ length: scene.gridHeight }).map((_, y) => (
            <rect
              key={`cell-${x}-${y}`}
              x={x * CELL_SIZE + 1}
              y={y * CELL_SIZE + 1}
              width={CELL_SIZE - 1}
              height={CELL_SIZE - 1}
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="0.5"
              className="cursor-pointer hover:fill-slate-700 transition-colors"
              onClick={() => onCellClick?.({ x, y })}
            />
          ))
        )}

        {highlightPath && highlightPath.map((pos, idx) => (
          <circle
            key={`path-${idx}`}
            cx={pos.x * CELL_SIZE + CELL_SIZE / 2 + 1}
            cy={pos.y * CELL_SIZE + CELL_SIZE / 2 + 1}
            r={8}
            fill="rgba(59, 130, 246, 0.5)"
            className="animate-pulse"
          />
        ))}

        {scene.obstacles.map((obstacle) => (
          <g key={obstacle.id}>
            <rect
              x={obstacle.position.x * CELL_SIZE + 5}
              y={obstacle.position.y * CELL_SIZE + 5}
              width={CELL_SIZE - 8}
              height={CELL_SIZE - 8}
              fill={getObstacleColor(obstacle.type)}
              rx={4}
            />
            {obstacle.type === 'charging' && (
              <text
                x={obstacle.position.x * CELL_SIZE + CELL_SIZE / 2 + 1}
                y={obstacle.position.y * CELL_SIZE + CELL_SIZE / 2 + 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
              >
                ⚡
              </text>
            )}
          </g>
        ))}

        {scene.shelves.map((shelf) => (
          <g key={shelf.id}>
            <rect
              x={shelf.position.x * CELL_SIZE + 4}
              y={shelf.position.y * CELL_SIZE + 4}
              width={CELL_SIZE - 6}
              height={CELL_SIZE - 6}
              fill="#8b5cf6"
              rx={4}
              stroke="#a78bfa"
              strokeWidth="2"
            />
            <text
              x={shelf.position.x * CELL_SIZE + CELL_SIZE / 2 + 1}
              y={shelf.position.y * CELL_SIZE + CELL_SIZE / 2 + 4}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {shelf.name.slice(0, 2)}
            </text>
          </g>
        ))}

        {robots.map((robot) => (
          <g key={robot.id} className="cursor-pointer">
            {robot.currentPath && robot.pathIndex !== undefined && (
              <polyline
                points={robot.currentPath
                  .slice(robot.pathIndex)
                  .map((p) => `${p.x * CELL_SIZE + CELL_SIZE / 2 + 1},${p.y * CELL_SIZE + CELL_SIZE / 2 + 1}`)
                  .join(' ')}
                fill="none"
                stroke={getRobotColor(robot)}
                strokeWidth="2"
                strokeDasharray="4,4"
                opacity="0.6"
              />
            )}
            <circle
              cx={robot.position.x * CELL_SIZE + CELL_SIZE / 2 + 1}
              cy={robot.position.y * CELL_SIZE + CELL_SIZE / 2 + 1}
              r={18}
              fill={getRobotColor(robot)}
              stroke={robot.id === selectedRobotId ? '#fff' : 'transparent'}
              strokeWidth="3"
              className="transition-all duration-300"
            />
            <text
              x={robot.position.x * CELL_SIZE + CELL_SIZE / 2 + 1}
              y={robot.position.y * CELL_SIZE + CELL_SIZE / 2 + 4}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="bold"
            >
              {robot.name}
            </text>
            <rect
              x={robot.position.x * CELL_SIZE + 10}
              y={robot.position.y * CELL_SIZE + CELL_SIZE - 10}
              width={CELL_SIZE - 18}
              height={5}
              fill="#374151"
              rx={2}
            />
            <rect
              x={robot.position.x * CELL_SIZE + 10}
              y={robot.position.y * CELL_SIZE + CELL_SIZE - 10}
              width={(CELL_SIZE - 18) * (robot.battery / robot.maxBattery)}
              height={5}
              fill={robot.battery > 30 ? '#22c55e' : robot.battery > 10 ? '#eab308' : '#ef4444'}
              rx={2}
              className="transition-all duration-300"
            />
          </g>
        ))}
      </svg>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500"></div>
          <span>空闲</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>配送中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>低电量</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>充电中/桩</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500"></div>
          <span>货架</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-600"></div>
          <span>障碍物</span>
        </div>
      </div>
    </div>
  );
};

export default WarehouseGrid;
