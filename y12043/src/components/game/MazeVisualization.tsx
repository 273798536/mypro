import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MazeNode, RouteBranch } from '@/types';
import { defaultMaze } from '@/data/maze';
import { Play, Flag, AlertTriangle, GitBranch, Zap } from 'lucide-react';

interface MazeVisualizationProps {
  currentNodeId: string;
  visitedNodes: string[];
  decisions: { nodeId: string; routeBranch: RouteBranch }[];
}

export function MazeVisualization({ 
  currentNodeId, 
  visitedNodes,
  decisions 
}: MazeVisualizationProps) {
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    Object.values(defaultMaze.nodes).forEach(node => {
      positions[node.id] = { x: node.x * 90 + 50, y: node.y * 80 + 50 };
    });
    return positions;
  }, []);

  const getNodeIcon = (node: MazeNode) => {
    switch (node.type) {
      case 'start': return <Play className="w-4 h-4" />;
      case 'end': return <Flag className="w-4 h-4" />;
      case 'industry_gate': return <AlertTriangle className="w-4 h-4" />;
      case 'choice': return <GitBranch className="w-4 h-4" />;
      case 'event': return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  const getNodeColor = (nodeId: string, isCurrent: boolean, isVisited: boolean) => {
    if (isCurrent) return 'bg-amber-400 border-amber-500 ring-4 ring-amber-200';
    if (isVisited) return 'bg-emerald-400 border-emerald-500';
    return 'bg-gray-200 border-gray-300';
  };

  const getBranchColor = (branch: RouteBranch) => {
    const colors: Record<RouteBranch, string> = {
      'A': '#10B981',
      'B': '#F59E0B',
      'C': '#EF4444',
    };
    return colors[branch];
  };

  const getDecisionForNode = (nodeId: string) => {
    return decisions.find(d => d.nodeId === nodeId);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 shadow-inner">
      <div className="text-sm font-medium text-slate-600 mb-3">迷宫进度</div>
      <svg width="820" height="200" className="w-full h-auto">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
        </defs>

        {Object.values(defaultMaze.nodes).map(node => 
          node.connections.map(conn => {
            const from = nodePositions[node.id];
            const to = nodePositions[conn.nodeId];
            if (!from || !to) return null;
            
            const decision = getDecisionForNode(node.id);
            const isActivePath = decision && decision.routeBranch === conn.branch;
            
            return (
              <line
                key={`${node.id}-${conn.branch}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isActivePath ? getBranchColor(conn.branch) : '#cbd5e1'}
                strokeWidth={isActivePath ? 4 : 2}
                strokeDasharray={isActivePath ? 'none' : '5,5'}
                markerEnd="url(#arrowhead)"
                className="transition-all duration-500"
              />
            );
          })
        )}

        {Object.entries(defaultMaze.nodes).map(([nodeId, node]) => {
          const pos = nodePositions[nodeId];
          if (!pos) return null;
          
          const isCurrent = nodeId === currentNodeId;
          const isVisited = visitedNodes.includes(nodeId);
          
          return (
            <g key={nodeId}>
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={isCurrent ? 24 : 20}
                className={`${getNodeColor(nodeId, isCurrent, isVisited)} transition-all duration-300`}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.5 }}
              />
              <foreignObject x={pos.x - 12} y={pos.y - 12} width="24" height="24">
                <div className="w-full h-full flex items-center justify-center text-white">
                  {getNodeIcon(node)}
                </div>
              </foreignObject>
              <text
                x={pos.x}
                y={pos.y + 38}
                textAnchor="middle"
                className="text-xs fill-slate-500"
              >
                {node.type === 'start' ? '起点' : 
                 node.type === 'end' ? '终点' : 
                 node.type === 'industry_gate' ? '行业门' :
                 node.type === 'event' ? '事件' :
                 `选择${node.id.slice(-1)}`}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          <span className="text-slate-600">稳健路线A</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-slate-600">波动路线B</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span className="text-slate-600">高风险路线C</span>
        </div>
      </div>
    </div>
  );
}
