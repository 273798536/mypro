import React, { useMemo } from 'react';
import { NetworkNode, PipeConnection, NodeStatus } from '../../types/game';
import { useGameStore } from '../../store/useGameStore';

const nodeIcons: Record<string, string> = {
  ice_mine: '❄️',
  pump: '⚙️',
  greenhouse: '🌱',
  recycler: '♻️',
  base: '🏠',
};

const statusColors: Record<NodeStatus, string> = {
  normal: '#22C55E',
  warning: '#FBBF24',
  danger: '#EF4444',
  disconnected: '#6B7280',
};

const statusGlow: Record<NodeStatus, string> = {
  normal: '0 0 15px rgba(34, 197, 94, 0.6)',
  warning: '0 0 15px rgba(251, 191, 36, 0.6)',
  danger: '0 0 20px rgba(239, 68, 68, 0.8)',
  disconnected: 'none',
};

interface BaseMapProps {
  selectedNode?: string;
  onNodeSelect?: (nodeId: string) => void;
  reviewNodes?: NetworkNode[];
  reviewPipes?: PipeConnection[];
}

const BaseMap: React.FC<BaseMapProps> = ({ selectedNode, onNodeSelect, reviewNodes, reviewPipes }) => {
  const storeNodes = useGameStore(state => state.nodes);
  const storePipes = useGameStore(state => state.pipes);
  
  const nodes = reviewNodes || storeNodes;
  const pipes = reviewPipes || storePipes;

  const nodeMap = useMemo(() => {
    const map = new Map<string, NetworkNode>();
    nodes.forEach(node => map.set(node.id, node));
    return map;
  }, [nodes]);

  return (
    <div className="relative w-full h-full bg-space-800 rounded-xl overflow-hidden glow-border">
      <div className="absolute inset-0 bg-grid opacity-50" />
      
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 800 440"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {pipes.map((pipe) => {
          const fromNode = nodeMap.get(pipe.from);
          const toNode = nodeMap.get(pipe.to);
          if (!fromNode || !toNode) return null;

          const isDisconnected = pipe.status === 'disconnected' || 
            fromNode.status === 'disconnected' || 
            toNode.status === 'disconnected';
          
          const strokeColor = isDisconnected ? '#6B7280' : 
            pipe.status === 'leaking' ? '#FBBF24' : '#2DD4BF';

          return (
            <g key={pipe.id}>
              <line
                x1={fromNode.position.x}
                y1={fromNode.position.y}
                x2={toNode.position.x}
                y2={toNode.position.y}
                stroke={strokeColor}
                strokeWidth={isDisconnected ? 3 : 6}
                strokeDasharray={isDisconnected ? '10,5' : 'none'}
                opacity={isDisconnected ? 0.5 : 0.8}
              />
              
              {!isDisconnected && (
                <line
                  x1={fromNode.position.x}
                  y1={fromNode.position.y}
                  x2={toNode.position.x}
                  y2={toNode.position.y}
                  stroke="url(#pipeGradient)"
                  strokeWidth={2}
                  filter="url(#glow)"
                  className="animate-flow"
                />
              )}
              
              <text
                x={(fromNode.position.x + toNode.position.x) / 2}
                y={(fromNode.position.y + toNode.position.y) / 2 - 10}
                fill="#9CA3AF"
                fontSize="10"
                textAnchor="middle"
              >
                {pipe.flowRate}/{pipe.maxFlow}
              </text>
            </g>
          );
        })}

        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const hasAnomaly = node.status === 'danger' || node.status === 'disconnected';
          
          return (
            <g 
              key={node.id}
              onClick={() => onNodeSelect?.(node.id)}
              className="cursor-pointer"
              style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
            >
              {hasAnomaly && node.status !== 'disconnected' && (
                <circle
                  r={35}
                  fill="none"
                  stroke={statusColors[node.status]}
                  strokeWidth={2}
                  opacity={0.5}
                  className="animate-pulse"
                />
              )}
              
              <circle
                r={28}
                fill="#162A47"
                stroke={isSelected ? '#2DD4BF' : statusColors[node.status]}
                strokeWidth={isSelected ? 3 : 2}
                style={{ 
                  filter: statusGlow[node.status],
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
              />
              
              <text
                y={5}
                textAnchor="middle"
                fontSize="20"
                className="select-none"
              >
                {nodeIcons[node.type]}
              </text>
              
              <text
                y={50}
                textAnchor="middle"
                fill="#E5E7EB"
                fontSize="11"
                fontWeight="500"
                className="select-none"
              >
                {node.name}
              </text>
              
              <g transform="translate(-20, 60)">
                <rect
                  width={40}
                  height={4}
                  rx={2}
                  fill="#1F2937"
                />
                <rect
                  width={40 * (node.health / 100)}
                  height={4}
                  rx={2}
                  fill={statusColors[node.status]}
                />
              </g>
              
              <text
                y={78}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="9"
                className="select-none"
              >
                负载: {node.currentLoad}/{node.capacity}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>正常</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>警告</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>危险</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span>断连</span>
        </div>
      </div>
    </div>
  );
};

export default BaseMap;
