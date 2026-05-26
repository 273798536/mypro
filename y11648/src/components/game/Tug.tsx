import { motion } from 'framer-motion';
import type { Tug as TugType } from '../../types';
import { getFuelStatus, getFuelStatusColor } from '../../utils/fuelCalculator';

interface TugProps {
  tug: TugType;
  isSelected: boolean;
  onSelect: () => void;
}

const Tug = ({ tug, isSelected, onSelect }: TugProps) => {
  const fuelStatus = getFuelStatus(tug);
  const fuelColor = getFuelStatusColor(fuelStatus);
  const fuelPercent = (tug.currentFuel / tug.fuelCapacity) * 100;

  const statusColors: Record<string, string> = {
    idle: '#f59e0b',
    moving: '#3b82f6',
    working: '#10b981',
    refueling: '#8b5cf6',
  };

  const statusLabels: Record<string, string> = {
    idle: '空闲',
    moving: '移动中',
    working: '作业中',
    refueling: '加油中',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <g
      className="cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
    >
      <motion.g
        animate={{
          x: tug.position.x - 20,
          y: tug.position.y - 12,
        }}
        transition={{
          type: 'tween',
          ease: 'linear',
          duration: 0.1,
        }}
      >
        {isSelected && (
          <motion.circle
            cx="20"
            cy="12"
            r="25"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeDasharray="8,4"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ transformOrigin: '20px 12px' }}
          />
        )}

        <rect
          x="2"
          y="4"
          width="36"
          height="16"
          fill={statusColors[tug.status]}
          rx="4"
          className="transition-all duration-300"
          filter={isSelected ? 'url(#glow)' : undefined}
        />

        <polygon
          points="38,8 44,12 38,16"
          fill={statusColors[tug.status]}
        />

        <rect
          x="6"
          y="0"
          width="8"
          height="6"
          fill="#1e293b"
          rx="1"
        />

        <rect x="5" y="20" width="30" height="4" fill="#334155" rx="2" />

        <rect x="5" y="20" width={30 * (fuelPercent / 100)} height="4" fill={fuelColor} rx="2" />

        <text
          x="20"
          y="15"
          textAnchor="middle"
          fill="white"
          fontSize="8"
          fontWeight="600"
        >
          🚢
        </text>
      </motion.g>

      <motion.text
        style={{
          x: tug.position.x,
          y: tug.position.y + 32,
        }}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="9"
        fontWeight="600"
      >
        {tug.name}
      </motion.text>

      <motion.text
        style={{
          x: tug.position.x,
          y: tug.position.y + 43,
        }}
        textAnchor="middle"
        fill={statusColors[tug.status]}
        fontSize="7"
        fontWeight="500"
      >
        {statusLabels[tug.status]}
      </motion.text>

      {isSelected && (
        <motion.text
          style={{
            x: tug.position.x,
            y: tug.position.y - 25,
          }}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="10"
          fontWeight="600"
          animate={{
            y: [tug.position.y - 25, tug.position.y - 28, tug.position.y - 25],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          已选中
        </motion.text>
      )}
    </g>
  );
};

export default Tug;
