import { motion } from 'framer-motion';
import type { Berth as BerthType } from '../../types';

interface BerthProps {
  berth: BerthType;
}

const Berth = ({ berth }: BerthProps) => {
  const statusColors: Record<string, string> = {
    available: '#10b981',
    occupied: '#ef4444',
    reserved: '#f59e0b',
  };

  const statusLabels: Record<string, string> = {
    available: '可用',
    occupied: '占用',
    reserved: '预留',
  };

  return (
    <g>
      <motion.rect
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        x={berth.position.x - 30}
        y={berth.position.y - 25}
        width="60"
        height="50"
        fill={statusColors[berth.status]}
        fillOpacity="0.2"
        stroke={statusColors[berth.status]}
        strokeWidth="2"
        rx="4"
        className="cursor-pointer transition-all duration-300"
        whileHover={{
          fillOpacity: 0.4,
          scale: 1.02,
        }}
      />

      <line
        x1={berth.position.x - 30}
        y1={berth.position.y - 25}
        x2={berth.position.x - 30}
        y2={berth.position.y + 25}
        stroke={statusColors[berth.status]}
        strokeWidth="4"
        strokeLinecap="round"
      />

      <text
        x={berth.position.x}
        y={berth.position.y - 5}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="11"
        fontWeight="600"
      >
        {berth.name}
      </text>

      <text
        x={berth.position.x}
        y={berth.position.y + 12}
        textAnchor="middle"
        fill={statusColors[berth.status]}
        fontSize="9"
        fontWeight="500"
      >
        {statusLabels[berth.status]}
      </text>

      {berth.status === 'occupied' && berth.occupiedBy && (
        <text
          x={berth.position.x}
          y={berth.position.y + 30}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="8"
        >
          {berth.occupiedBy}
        </text>
      )}

      <text
        x={berth.position.x}
        y={berth.position.y + 42}
        textAnchor="middle"
        fill="#64748b"
        fontSize="7"
      >
        {berth.maxLength}m / {berth.minDepth}m
      </text>
    </g>
  );
};

export default Berth;
