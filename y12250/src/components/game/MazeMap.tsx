import { useMemo, useState } from 'react';
import type { MazeNode, NodeChoice } from '../../engine/types';
import { AlertTriangle, Play, Flag, CircleDot } from 'lucide-react';

interface MazeMapProps {
  nodes: MazeNode[];
  currentNodeId: string;
  visitedNodes: string[];
  onNodeClick?: (node: MazeNode) => void;
  onChoiceClick?: (choice: NodeChoice) => void;
  disabled?: boolean;
}

export default function MazeMap({
  nodes,
  currentNodeId,
  visitedNodes,
  onNodeClick,
  onChoiceClick,
  disabled = false,
}: MazeMapProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const currentNode = useMemo(
    () => nodes.find((n) => n.id === currentNodeId),
    [nodes, currentNodeId]
  );

  const connections = useMemo(() => {
    const edges: { from: MazeNode; to: MazeNode; choice: NodeChoice }[] = [];
    nodes.forEach((node) => {
      node.choices.forEach((choice) => {
        const targetNode = nodes.find((n) => n.id === choice.nextNodeId);
        if (targetNode) {
          edges.push({ from: node, to: targetNode, choice });
        }
      });
    });
    return edges;
  }, [nodes]);

  const getNodeColor = (node: MazeNode) => {
    if (node.id === currentNodeId) {
      return '#00FF88';
    }
    if (visitedNodes.includes(node.id)) {
      return '#2EC4B6';
    }
    switch (node.type) {
      case 'start':
        return '#2EC4B6';
      case 'end':
        return '#9D4EDD';
      case 'risk':
        return '#FF9F1C';
      default:
        return '#8892B0';
    }
  };

  const getNodeIcon = (node: MazeNode) => {
    switch (node.type) {
      case 'start':
        return <Play size={14} fill="currentColor" />;
      case 'end':
        return <Flag size={14} fill="currentColor" />;
      case 'risk':
        return <AlertTriangle size={14} />;
      default:
        return <CircleDot size={14} />;
    }
  };

  const handleNodeClick = (node: MazeNode) => {
    if (disabled) return;
    if (node.id === currentNodeId) {
      setSelectedNode(node.id === selectedNode ? null : node.id);
    }
    onNodeClick?.(node);
  };

  const handleChoiceClick = (choice: NodeChoice) => {
    if (disabled) return;
    setSelectedNode(null);
    onChoiceClick?.(choice);
  };

  const svgWidth = Math.max(...nodes.map((n) => n.x)) + 150;
  const svgHeight = Math.max(...nodes.map((n) => n.y)) + 150;

  return (
    <div className="relative w-full overflow-auto scrollbar-thin">
      <svg
        width={svgWidth}
        height={svgHeight}
        className="min-w-full"
        style={{ minHeight: '400px' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#2a3a5c" />
          </marker>
        </defs>

        {connections.map((edge, idx) => {
          const isActive =
            visitedNodes.includes(edge.from.id) &&
            (visitedNodes.includes(edge.to.id) || edge.to.id === currentNodeId);
          const isCurrent =
            edge.from.id === currentNodeId &&
            currentNode?.choices.some((c) => c.nextNodeId === edge.to.id);

          return (
            <line
              key={idx}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={isActive ? '#00FF88' : isCurrent ? '#9D4EDD' : '#2a3a5c'}
              strokeWidth={isCurrent ? 3 : 2}
              strokeDasharray={isCurrent ? '5,5' : 'none'}
              markerEnd="url(#arrowhead)"
              className="transition-all duration-500"
            />
          );
        })}

        {nodes.map((node) => {
          const color = getNodeColor(node);
          const isCurrent = node.id === currentNodeId;
          const isHovered = hoveredNode === node.id;
          const showChoices = selectedNode === node.id && isCurrent && !disabled;

          return (
            <g key={node.id}>
              {isCurrent && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={35}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  opacity={0.3}
                  className="animate-pulse"
                />
              )}

              <circle
                cx={node.x}
                cy={node.y}
                r={24}
                fill={color}
                opacity={visitedNodes.includes(node.id) || isCurrent ? 1 : 0.6}
                className={`cursor-pointer transition-all duration-300 ${
                  isCurrent ? 'maze-node-active' : ''
                }`}
                filter={isCurrent ? 'url(#glow)' : undefined}
                style={{
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: `${node.x}px ${node.y}px`,
                }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              />

              <text
                x={node.x}
                y={node.y + 5}
                textAnchor="middle"
                fill="#0B1220"
                fontSize="14"
                fontWeight="bold"
                pointerEvents="none"
                className="select-none"
              >
                {getNodeIcon(node)}
              </text>

              <foreignObject
                x={node.x - 60}
                y={node.y + 30}
                width={120}
                height={40}
                pointerEvents="none"
              >
                <div
                  className="text-center text-xs font-medium"
                  style={{ color }}
                >
                  {node.label}
                </div>
              </foreignObject>

              {isHovered && (
                <foreignObject
                  x={node.x - 100}
                  y={node.y - 80}
                  width={200}
                  height={60}
                  pointerEvents="none"
                >
                  <div className="bg-defi-card border border-defi-border rounded-lg p-2 text-xs animate-fade-in shadow-lg">
                    <div className="font-medium text-defi-text mb-1">
                      {node.label}
                    </div>
                    <div className="text-defi-text-muted">
                      {node.description}
                    </div>
                  </div>
                </foreignObject>
              )}

              {showChoices && node.choices.length > 0 && (
                <foreignObject
                  x={node.x - 120}
                  y={node.y + 70}
                  width={240}
                  height={node.choices.length * 80 + 20}
                >
                  <div className="bg-defi-card border border-defi-accent rounded-xl p-3 animate-slide-up shadow-glow-accent">
                    <div className="text-sm font-medium text-defi-accent mb-2">
                      选择操作：
                    </div>
                    <div className="space-y-2">
                      {node.choices.map((choice) => (
                        <button
                          key={choice.id}
                          onClick={() => handleChoiceClick(choice)}
                          className="w-full text-left p-2 rounded-lg bg-defi-bg-light border border-defi-border hover:border-defi-accent hover:bg-defi-bg transition-all text-xs group"
                        >
                          <div className="font-medium text-defi-text group-hover:text-defi-accent transition-colors">
                            {choice.label}
                          </div>
                          <div className="text-defi-text-muted mt-1">
                            {choice.description}
                          </div>
                          <div className="text-defi-warning mt-1 text-[10px]">
                            {choice.ruleHint}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {currentNode && currentNode.choices.length > 0 && !selectedNode && !disabled && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-defi-card border border-defi-accent/50 rounded-lg px-4 py-2 text-sm text-defi-accent animate-pulse">
          点击当前绿色节点选择操作路线
        </div>
      )}
    </div>
  );
}
