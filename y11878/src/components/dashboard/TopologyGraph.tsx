import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetworkStore } from '@/store/useNetworkStore';
import type { Node, Route } from '@/types';

interface TopologyGraphProps {
  width?: number;
  height?: number;
}

function getNodeColor(node: Node): string {
  if (node.isIsolated) return '#EF4444';
  switch (node.type) {
    case 'warehouse':
      return '#06B6D4';
    case 'distribution':
      return '#F59E0B';
    case 'demand':
      return '#F97316';
    default:
      return '#64748B';
  }
}

function getRouteColor(route: Route): string {
  if (route.isBottleneck) return '#EF4444';
  if (route.capacity === 0) return '#64748B';
  if (route.utilization > 0.7) return '#F59E0B';
  if (route.utilization > 0.4) return '#F97316';
  return '#06B6D4';
}

function getRouteWidth(route: Route): number {
  if (route.capacity === 0) return 1;
  const maxWidth = 6;
  const minWidth = 2;
  const util = Math.max(0.1, route.utilization);
  return minWidth + (maxWidth - minWidth) * util;
}

export default function TopologyGraph({
  width = 900,
  height = 600,
}: TopologyGraphProps) {
  const navigate = useNavigate();
  const { nodes, routes, selectedRouteId, setSelectedRouteId, analysisResult } = useNetworkStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);

  const padding = 60;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const positionedNodes = useMemo(() => {
    const maxX = Math.max(...nodes.map((n) => n.x), 1);
    const maxY = Math.max(...nodes.map((n) => n.y), 1);
    return nodes.map((node) => ({
      ...node,
      px: padding + (node.x / maxX) * innerWidth,
      py: padding + (node.y / maxY) * innerHeight,
    }));
  }, [nodes, innerWidth, innerHeight]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, typeof positionedNodes[0]>();
    positionedNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  const handleRouteClick = (routeId: string) => {
    setSelectedRouteId(routeId);
    navigate(`/trace?routeId=${routeId}`);
  };

  if (nodes.length === 0) {
    return (
      <div className="card p-8 flex items-center justify-center h-[600px]">
        <p className="text-base-500 text-sm">点击"加载样例"查看网络拓扑</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">网络拓扑图</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-cyan" />
            <span className="text-base-500">仓库</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-amber" />
            <span className="text-base-500">分拣中心</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-orange" />
            <span className="text-base-500">需求点</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent-red" />
            <span className="text-base-500">异常</span>
          </div>
        </div>
      </div>

      <div className="relative overflow-auto scrollbar-thin">
        <svg width={width} height={height} className="block">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748B" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {routes.map((route) => {
            const fromNode = nodeMap.get(route.from);
            const toNode = nodeMap.get(route.to);
            if (!fromNode || !toNode) return null;

            const isSelected = selectedRouteId === route.id;
            const isHovered = hoveredRoute === route.id;
            const isBottleneck = route.isBottleneck;

            const midX = (fromNode.px + toNode.px) / 2;
            const midY = (fromNode.py + toNode.py) / 2;

            const dx = toNode.px - fromNode.px;
            const dy = toNode.py - fromNode.py;
            const length = Math.sqrt(dx * dx + dy * dy);
            const offsetRatio = 20 / length;
            const endX = toNode.px - dx * offsetRatio;
            const endY = toNode.py - dy * offsetRatio;

            return (
              <g key={route.id}>
                <line
                  x1={fromNode.px}
                  y1={fromNode.py}
                  x2={endX}
                  y2={endY}
                  stroke={getRouteColor(route)}
                  strokeWidth={getRouteWidth(route)}
                  strokeOpacity={isSelected || isHovered || isBottleneck ? 1 : 0.5}
                  className={`cursor-pointer transition-all duration-200 ${isBottleneck ? 'animate-breathe' : ''}`}
                  filter={isSelected || isHovered ? 'url(#glow)' : undefined}
                  onClick={() => handleRouteClick(route.id)}
                  onMouseEnter={() => setHoveredRoute(route.id)}
                  onMouseLeave={() => setHoveredRoute(null)}
                  markerEnd="url(#arrowhead)"
                />
                {(isHovered || isSelected) && (
                  <g>
                    <rect
                      x={midX - 50}
                      y={midY - 30}
                      width="100"
                      height="24"
                      fill="#1E293B"
                      stroke="#475569"
                    />
                    <text
                      x={midX}
                      y={midY - 13}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                    >
                      {route.flow}/{route.capacity}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {positionedNodes.map((node) => {
            const isHovered = hoveredNode === node.id;
            const isIsolated = node.isIsolated;

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {isIsolated && (
                  <circle
                    cx={node.px}
                    cy={node.py}
                    r="22"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="2"
                    className="animate-pulse-slow"
                  />
                )}
                <circle
                  cx={node.px}
                  cy={node.py}
                  r="18"
                  fill={getNodeColor(node)}
                  stroke={isHovered ? '#FFF' : '#0F172A'}
                  strokeWidth="2"
                  filter={isHovered ? 'url(#glow)' : undefined}
                />
                <text
                  x={node.px}
                  y={node.py - 28}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="11"
                  fontFamily="Inter"
                >
                  {node.name}
                </text>
                <text
                  x={node.px}
                  y={node.py + 4}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  {node.id}
                </text>
                {isHovered && (
                  <g>
                    <rect
                      x={node.px - 60}
                      y={node.py + 28}
                      width="120"
                      height="40"
                      fill="#1E293B"
                      stroke="#475569"
                    />
                    <text
                      x={node.px}
                      y={node.py + 45}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="11"
                    >
                      {node.name}
                    </text>
                    <text
                      x={node.px}
                      y={node.py + 60}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                    >
                      容量: {node.capacity}
                      {node.demand ? ` / 需求: ${node.demand}` : ''}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {analysisResult && (
        <div className="mt-4 pt-4 border-t border-base-700 flex items-center justify-between text-xs text-base-500">
          <span>点击线路查看瓶颈追溯</span>
          <span className="font-mono">
            {routes.filter((r) => r.isBottleneck).length} 条瓶颈线路
          </span>
        </div>
      )}
    </div>
  );
}
