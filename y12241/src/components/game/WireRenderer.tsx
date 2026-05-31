import { motion } from 'framer-motion';
import { Wire, Node } from '../../types';

interface WireRendererProps {
  wire: Wire;
  nodes: Node[];
}

export default function WireRenderer({ wire, nodes }: WireRendererProps) {
  const fromNode = nodes.find(n => n.id === wire.fromNodeId);
  const toNode = nodes.find(n => n.id === wire.toNodeId);

  if (!fromNode || !toNode) return null;

  const midX = (fromNode.x + toNode.x) / 2;
  const midY = (fromNode.y + toNode.y) / 2 - 20;

  const getWireColor = () => {
    if (!wire.active) return '#475569';
    if (wire.isParallel) return '#8B5CF6';
    if (wire.hasCurrent) return '#F59E0B';
    return '#64748B';
  };

  const getWireWidth = () => {
    if (wire.hasCurrent) return 4;
    return 3;
  };

  const pathD = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY} ${toNode.x} ${toNode.y}`;

  return (
    <g>
      {wire.active && (
        <path
          d={pathD}
          fill="none"
          stroke={getWireColor()}
          strokeWidth={getWireWidth() + 6}
          strokeOpacity={wire.hasCurrent ? 0.2 : 0.1}
          strokeLinecap="round"
        />
      )}

      <motion.path
        d={pathD}
        fill="none"
        stroke={getWireColor()}
        strokeWidth={getWireWidth()}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={wire.hasCurrent && wire.active ? 'wire-active' : ''}
        style={
          wire.hasCurrent && wire.active
            ? {
                strokeDasharray: '10 5',
                animation: 'currentFlow 2s linear infinite',
              }
            : {}
        }
      />

      {wire.isParallel && wire.active && (
        <g>
          <circle
            cx={(fromNode.x + toNode.x) / 2}
            cy={(fromNode.y + toNode.y) / 2}
            r={8}
            fill="#8B5CF6"
            opacity={0.3}
          />
          <text
            x={(fromNode.x + toNode.x) / 2}
            y={(fromNode.y + toNode.y) / 2 + 4}
            textAnchor="middle"
            className="fill-white text-[10px] font-bold"
          >
            并
          </text>
        </g>
      )}

      {!wire.active && (
        <g>
          <line
            x1={fromNode.x - 8}
            y1={fromNode.y - 8}
            x2={fromNode.x + 8}
            y2={fromNode.y + 8}
            stroke="#EF4444"
            strokeWidth={2}
          />
          <line
            x1={toNode.x - 8}
            y1={toNode.y - 8}
            x2={toNode.x + 8}
            y2={toNode.y + 8}
            stroke="#EF4444"
            strokeWidth={2}
          />
        </g>
      )}
    </g>
  );
}
