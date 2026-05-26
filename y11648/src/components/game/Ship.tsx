import { motion } from 'framer-motion';
import type { Ship as ShipType } from '../../types';
import { useGameStore } from '../../store/gameStore';

interface ShipProps {
  ship: ShipType;
}

const Ship = ({ ship }: ShipProps) => {
  const { selectedTugId, assignTugToTask, tasks, addLog, currentTime } = useGameStore();

  const statusColors: Record<string, string> = {
    waiting: '#3b82f6',
    docking: '#f59e0b',
    docked: '#10b981',
    undocking: '#8b5cf6',
    departed: '#6b7280',
  };

  const statusLabels: Record<string, string> = {
    waiting: '等待',
    docking: '靠泊中',
    docked: '已靠泊',
    undocking: '离泊中',
    departed: '已离开',
  };

  const shipTypeIcons: Record<string, string> = {
    container: '📦',
    bulk: '⛰️',
    tanker: '🛢️',
    passenger: '🚢',
  };

  const handleClick = () => {
    if (selectedTugId) {
      const pendingTask = tasks.find(
        (t) => t.shipId === ship.id && t.status === 'pending'
      );
      if (pendingTask) {
        assignTugToTask(selectedTugId, pendingTask.id);
      } else {
        addLog({
          gameTime: currentTime,
          type: 'conflict',
          action: `${ship.name} 没有待处理的任务`,
          targetId: ship.id,
          isCorrection: false,
          source: 'system',
        });
      }
    }
  };

  return (
    <g
      className="cursor-pointer"
      onClick={handleClick}
      style={{ pointerEvents: ship.status === 'departed' ? 'none' : 'auto' }}
    >
      <motion.g
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: ship.status === 'departed' ? 0.3 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <ellipse
          cx={ship.position.x}
          cy={ship.position.y}
          rx="35"
          ry="18"
          fill={statusColors[ship.status]}
          fillOpacity="0.3"
          stroke={statusColors[ship.status]}
          strokeWidth="2"
        />

        <rect
          x={ship.position.x - 25}
          y={ship.position.y - 8}
          width="50"
          height="16"
          fill={statusColors[ship.status]}
          rx="4"
        />

        <rect
          x={ship.position.x + 10}
          y={ship.position.y - 15}
          width="12"
          height="12"
          fill="#1e293b"
          rx="2"
        />

        <text
          x={ship.position.x - 15}
          y={ship.position.y + 3}
          fill="white"
          fontSize="10"
          fontWeight="600"
        >
          {shipTypeIcons[ship.type]}
        </text>

        <text
          x={ship.position.x}
          y={ship.position.y + 35}
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize="10"
          fontWeight="600"
        >
          {ship.name}
        </text>

        <text
          x={ship.position.x}
          y={ship.position.y + 48}
          textAnchor="middle"
          fill={statusColors[ship.status]}
          fontSize="8"
          fontWeight="500"
        >
          {statusLabels[ship.status]} · {ship.requiredTugs}拖轮
        </text>

        {selectedTugId && ship.status === 'waiting' && (
          <motion.circle
            cx={ship.position.x}
            cy={ship.position.y}
            r="40"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,5"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )}
      </motion.g>
    </g>
  );
};

export default Ship;
