import { motion } from 'framer-motion';
import { Zap, Home, Factory, AlertTriangle, Wrench } from 'lucide-react';
import { Node } from '../../types';
import { useGameStore, useSelectedNode, useSelectedTool } from '../../store/useGameStore';

interface NodeRendererProps {
  node: Node;
  showRipple?: boolean;
}

const nodeColors = {
  power_station: { bg: '#F59E0B', ring: '#FBBF24' },
  substation: { bg: '#3B82F6', ring: '#60A5FA' },
  consumer: { bg: '#10B981', ring: '#34D399' },
  fault: { bg: '#EF4444', ring: '#F87171' },
};

const statusColors = {
  normal: '',
  fault: 'animate-glow-red',
  overload: 'animate-glow-red',
  short_circuit: 'animate-glow-red',
  blocked: 'animate-glow-red',
};

export default function NodeRenderer({ node, showRipple = false }: NodeRendererProps) {
  const handleNodeClick = useGameStore(state => state.actions.handleNodeClick);
  const selectedNode = useSelectedNode();
  const selectedTool = useSelectedTool();

  const isSelected = selectedNode === node.id;
  const colors = nodeColors[node.type];
  const statusAnim = node.status !== 'normal' ? statusColors[node.status] : '';
  const poweredClass = node.powered ? 'node-powered' : '';
  const anomalyClass = node.status !== 'normal' ? 'node-anomaly' : '';

  const getIcon = () => {
    if (node.isPowerSource) return <Zap className="w-6 h-6 text-white" />;
    if (node.status === 'blocked' || node.status === 'fault') {
      return <AlertTriangle className="w-5 h-5 text-white" />;
    }
    switch (node.type) {
      case 'consumer':
        return <Home className="w-5 h-5 text-white" />;
      case 'substation':
        return <Factory className="w-5 h-5 text-white" />;
      default:
        return <Factory className="w-5 h-5 text-white" />;
    }
  };

  const getCursor = () => {
    if (selectedTool === 'power_station' && !node.isPowerSource) return 'pointer';
    if (selectedTool === 'wire') return 'pointer';
    if (selectedTool === 'repair_team' && node.status !== 'normal') return 'pointer';
    return 'default';
  };

  return (
    <g
      className={`cursor-${getCursor()} ${poweredClass} ${anomalyClass}`}
      onClick={() => handleNodeClick(node.id)}
      style={{ cursor: getCursor() }}
    >
      {showRipple && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={20}
          fill="rgba(245, 158, 11, 0.3)"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {isSelected && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={32}
          fill="none"
          stroke="#06B6D4"
          strokeWidth={3}
          strokeDasharray="8 4"
          initial={{ strokeDashoffset: 24 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <circle
        cx={node.x}
        cy={node.y}
        r={28}
        fill={colors.bg}
        stroke={colors.ring}
        strokeWidth={3}
        className={`${statusAnim} transition-all duration-300`}
      />

      {node.powered && !node.isPowerSource && (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={32}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.1, 1.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <g transform={`translate(${node.x - 12}, ${node.y - 12})`}>
        {getIcon()}
      </g>

      <text
        x={node.x}
        y={node.y + 48}
        textAnchor="middle"
        className="fill-slate-300 text-xs font-mono"
      >
        {node.label}
      </text>

      {node.isPowerSource && (
        <text
          x={node.x}
          y={node.y - 38}
          textAnchor="middle"
          className="fill-amber-400 text-[10px] font-display font-bold"
        >
          电源
        </text>
      )}

      {node.status === 'blocked' && (
        <g transform={`translate(${node.x + 16}, ${node.y - 16})`}>
          <Wrench className="w-4 h-4 text-red-400" />
        </g>
      )}
    </g>
  );
}
