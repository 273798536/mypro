import { useGameStore } from '@/store/gameStore';
import type { GridCell, Position, Robot } from '@/engine/types';
import { Zap, Truck, Box } from 'lucide-react';

const CELL_SIZE = 56;

function getBatteryColor(battery: number): string {
  if (battery > 60) return '#22C55E';
  if (battery > 30) return '#EAB308';
  return '#EF4444';
}

function CellRenderer({ cell, robots, isCollision }: {
  cell: GridCell;
  robots: Robot[];
  isCollision: boolean;
}) {
  const robot = robots.find(r => r.position.x === cell.x && r.position.y === cell.y);

  let bg = '#1a1a2e';
  let border = 'border-zinc-800';
  let content: React.ReactNode = null;

  if (cell.type === 'shelf') {
    bg = '#374151';
    content = (
      <div className="flex items-center justify-center w-full h-full">
        <Box size={20} className="text-zinc-400" />
      </div>
    );
  } else if (cell.type === 'charger') {
    bg = '#1e3a1e';
    content = (
      <div className="flex items-center justify-center w-full h-full">
        <Zap size={18} className="text-green-400" />
      </div>
    );
  } else if (cell.type === 'dispatch') {
    bg = '#1e2a3a';
    content = (
      <div className="flex items-center justify-center w-full h-full">
        <Truck size={18} className="text-blue-400" />
      </div>
    );
  } else if (cell.blocked) {
    bg = '#3a1e1e';
    content = (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-red-400 text-xs font-mono">X</span>
      </div>
    );
  }

  if (isCollision) {
    bg = '#7f1d1d';
  }

  return (
    <div
      className={`relative ${border} border`}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: bg,
        transition: 'background-color 0.15s ease',
      }}
    >
      {content}
      {robot && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            filter: robot.state === 'collision_cooldown' || robot.state === 'blocked'
              ? 'hue-rotate(300deg) brightness(1.5)' : 'none',
            animation: robot.state === 'blocked' ? 'pulse 0.5s infinite' : 'none',
          }}
        >
          <div
            className="rounded-full flex items-center justify-center shadow-lg"
            style={{
              width: 32,
              height: 32,
              backgroundColor: robot.color,
              border: `2px solid ${robot.state === 'idle' ? '#fff' : '#ffd700'}`,
              boxShadow: robot.state !== 'idle' ? `0 0 8px ${robot.color}` : 'none',
            }}
          >
            <span className="text-white text-xs font-bold">{robot.name[0]}</span>
          </div>
          <div
            className="absolute -bottom-0.5 w-8 h-1 rounded-full"
            style={{ backgroundColor: getBatteryColor(robot.battery) }}
          />
        </div>
      )}
    </div>
  );
}

function PathOverlay({ robots, mapWidth }: { robots: Robot[]; mapWidth: number }) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        width: mapWidth * CELL_SIZE,
        height: 8 * CELL_SIZE,
      }}
    >
      {robots.map(robot => {
        if (!robot.path || robot.path.length <= 1 || robot.pathIndex >= robot.path.length - 1) return null;
        const remaining = robot.path.slice(robot.pathIndex);
        if (remaining.length < 2) return null;

        const points = remaining
          .map(p => `${p.x * CELL_SIZE + CELL_SIZE / 2},${p.y * CELL_SIZE + CELL_SIZE / 2}`)
          .join(' ');

        return (
          <polyline
            key={robot.id}
            points={points}
            fill="none"
            stroke={robot.color}
            strokeWidth={2}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        );
      })}
    </svg>
  );
}

export default function WarehouseGrid() {
  const state = useGameStore(s => s.state);
  const isReplaying = useGameStore(s => s.isReplaying);
  const replayFrame = useGameStore(s => s.replayFrame);
  const assignOrder = useGameStore(s => s.assignOrder);

  const currentFrame = isReplaying && state.replayLog[replayFrame];

  const robots = currentFrame
    ? state.robots.map((r, i) => ({
        ...r,
        position: currentFrame.robots[i]?.position || r.position,
        battery: currentFrame.robots[i]?.battery || r.battery,
        state: currentFrame.robots[i]?.state || r.state,
      }))
    : state.robots;

  const collisionPositions = new Set<string>();
  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      if (robots[i].position.x === robots[j].position.x && robots[i].position.y === robots[j].position.y) {
        collisionPositions.add(`${robots[i].position.x},${robots[i].position.y}`);
      }
    }
  }

  const recentCollisionEvents = state.events
    .filter(e => e.type === 'collision' && e.tick >= state.tick - 3)
    .map(e => e.position)
    .filter(Boolean) as Position[];

  for (const p of recentCollisionEvents) {
    collisionPositions.add(`${p.x},${p.y}`);
  }

  return (
    <div className="relative">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${state.map.width}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${state.map.height}, ${CELL_SIZE}px)`,
        }}
      >
        {state.map.cells.flat().map(cell => (
          <CellRenderer
            key={`${cell.x}-${cell.y}`}
            cell={cell}
            robots={robots}
            isCollision={collisionPositions.has(`${cell.x},${cell.y}`)}
          />
        ))}
      </div>
      <PathOverlay robots={robots} mapWidth={state.map.width} />
    </div>
  );
}
