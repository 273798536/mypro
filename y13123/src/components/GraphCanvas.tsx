import { useState } from 'react';
import type { GraphNode, GraphEdge } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

function NodeTooltip({ node }: { node: GraphNode }) {
  const abnormal = useAppStore((s) =>
    s.abnormalPoints.find((a) => a.nodeId === node.id)
  );
  return (
    <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg border border-gold-700/40 bg-paper-50 px-3 py-2 text-[12px] shadow-card whitespace-nowrap">
      <div className="font-display text-[13px] text-ink-900">
        {node.label}
        <span className="ml-2 font-mono-data text-slateData-500">#{node.id}</span>
      </div>
      <div className="mt-0.5 font-mono-data text-slateData-500">
        坐标 ({node.x}, {node.y})
        {node.onShortestPath && (
          <span className="ml-2 text-gold-900">· 在最短路径上</span>
        )}
      </div>
      {abnormal && (
        <div className="mt-1 max-w-[240px] whitespace-normal text-ochre-700">
          ⚠ {abnormal.description.slice(0, 48)}…
        </div>
      )}
    </div>
  );
}

export default function GraphCanvas() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const pending = useAppStore((s) => s.pendingConfirmation);

  const width = 640;
  const height = 300;

  return (
    <div className="paper-card double-border relative animate-fadeSlideUp rounded-xl p-4" style={{ animationDelay: '120ms' }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[15px] text-ink-900">最短路径图</h3>
        <div className="flex items-center gap-3 text-[11.5px] text-slateData-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slateData-500" /> 普通节点
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gold-700" /> 路径节点
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-ochre-700" /> 异常节点
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-6 bg-gold-700" /> 最短路径
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-paper-100 to-paper-200">
        {pending && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-paper-100/85 backdrop-blur-[1px]">
            <div className="rounded-lg border border-ochre-700/30 bg-white px-4 py-2 text-[13px] text-ochre-700 shadow-card">
              计算挂起：请先确认顶部单位缺失提示
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[320px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id="grid-paper"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="rgba(176,137,104,0.12)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid-paper)" />

          {edges.map((e, idx) => {
            const from = nodes.find((n) => n.id === e.from);
            const to = nodes.find((n) => n.id === e.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const highlighted = e.onShortestPath;
            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={highlighted ? '#B08968' : '#ADB5BD'}
                  strokeWidth={highlighted ? 3.5 : 1.8}
                  strokeLinecap="round"
                  className={cn(
                    'transition-all duration-300',
                    highlighted && 'drop-shadow-[0_0_4px_rgba(176,137,104,0.5)]'
                  )}
                />
                <rect
                  x={midX - 12}
                  y={midY - 10}
                  width={24}
                  height={18}
                  rx={4}
                  fill={highlighted ? '#FBF8F0' : '#FFFFFF'}
                  stroke={highlighted ? '#B08968' : '#E4D7B6'}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  className={cn(
                    'font-mono-data text-[11px]',
                    highlighted ? 'fill-gold-900' : 'fill-slateData-500'
                  )}
                >
                  {e.weight}
                </text>
              </g>
            );
          })}

          {nodes.map((node) => {
            const isAbnormal = node.isAbnormal;
            const onPath = node.onShortestPath;
            const selected = selectedNodeId === node.id;
            const hover = hoverId === node.id;
            const fill = isAbnormal
              ? '#C8553D'
              : onPath
                ? '#B08968'
                : '#6C757D';
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => selectNode(node.id)}
                onMouseEnter={() => setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                {isAbnormal && (
                  <circle
                    r={12}
                    fill="none"
                    stroke="#C8553D"
                    strokeWidth={2}
                    className="origin-center animate-pulseRing"
                    style={{ transformOrigin: 'center' }}
                  />
                )}
                <circle
                  r={selected ? 13 : hover ? 11.5 : 10}
                  fill={fill}
                  stroke="#FBF8F0"
                  strokeWidth={2.5}
                  className={cn(
                    'transition-all duration-200',
                    selected && 'drop-shadow-[0_0_8px_rgba(27,67,50,0.45)]'
                  )}
                />
                <text
                  y={4}
                  textAnchor="middle"
                  className="font-mono-data text-[10.5px] font-semibold fill-white select-none pointer-events-none"
                >
                  {node.id}
                </text>
                <text
                  y={30}
                  textAnchor="middle"
                  className="font-display text-[11.5px] fill-ink-900 select-none pointer-events-none"
                >
                  {node.label}
                </text>
                {hover && (
                  <foreignObject x={-150} y={-90} width={300} height={100}>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <NodeTooltip node={node} />
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
