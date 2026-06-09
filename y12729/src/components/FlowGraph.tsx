import type { FlowNode, FlowEdge } from '@/types';

interface FlowGraphProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  width?: number;
  height?: number;
}

export default function FlowGraph({ nodes, edges, width = 720, height = 380 }: FlowGraphProps) {
  return (
    <div className="relative rounded-lg bg-deep-900/60 border border-deep-600/60 overflow-hidden">
      <div className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(0,180,216,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,180,216,0.06) 0%, transparent 50%)',
        }}
      />
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto relative z-10" style={{ minHeight: 320 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148,163,184,0.5)" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00B4D8" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {edges.map((e) => {
          const from = nodes.find((n) => n.id === e.from);
          const to = nodes.find((n) => n.id === e.to);
          if (!from || !to) return null;

          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const offsetX = (dx / len) * 24;
          const offsetY = (dy / len) * 24;

          const isBottleneck = e.isBottleneck;
          const hasFlow = e.flow > 0;
          const flowRatio = e.capacity > 0 ? e.flow / e.capacity : 0;

          return (
            <g key={e.id}>
              <line
                x1={from.x + offsetX}
                y1={from.y + offsetY}
                x2={to.x - offsetX}
                y2={to.y - offsetY}
                stroke={isBottleneck ? '#E63946' : hasFlow ? '#00B4D8' : 'rgba(148,163,184,0.35)'}
                strokeWidth={isBottleneck ? 3 : hasFlow ? 2.5 : 1.5}
                strokeDasharray={e.capacity <= 0 ? '6 4' : undefined}
                markerEnd={`url(#${isBottleneck || hasFlow ? 'arrow-active' : 'arrow'})`}
                opacity={isBottleneck ? 1 : hasFlow ? 0.9 : 0.6}
                filter={isBottleneck ? 'url(#glow)' : undefined}
              />
              <g transform={`translate(${(from.x + to.x) / 2}, ${(from.y + to.y) / 2 - 10})`}>
                <rect x="-28" y="-10" width="56" height="20" rx="4"
                  fill={isBottleneck ? 'rgba(230,57,70,0.9)' : hasFlow ? 'rgba(0,180,216,0.85)' : 'rgba(30,63,107,0.9)'}
                />
                <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="600" fill="#F8FAFC" fontFamily="JetBrains Mono, monospace">
                  {e.flow}/{e.capacity}
                </text>
              </g>
              {hasFlow && flowRatio > 0 && (
                <line
                  x1={from.x + offsetX}
                  y1={from.y + offsetY}
                  x2={to.x - offsetX}
                  y2={to.y - offsetY}
                  stroke="#48CAE4"
                  strokeWidth={1}
                  strokeDasharray={`${flowRatio * Math.sqrt(dx * dx + dy * dy)} 999`}
                  opacity={0.6}
                />
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const isSource = n.id === 'S' || n.label.includes('仓库') || n.label.includes('源') || n.label.includes('核心');
          const isSink = n.id === 'T' || n.label.includes('终端') || n.label.includes('汇') || n.label.includes('边缘');
          const isBottleneck = n.isBottleneck;

          let fill = '#163154';
          let stroke = 'rgba(0,180,216,0.3)';
          if (isSource) { fill = 'rgba(42,157,143,0.25)'; stroke = '#2A9D8F'; }
          if (isSink) { fill = 'rgba(244,162,97,0.25)'; stroke = '#F4A261'; }
          if (isBottleneck) { fill = 'rgba(230,57,70,0.3)'; stroke = '#E63946'; }

          return (
            <g key={n.id} className={isBottleneck ? 'animate-pulse-glow' : ''}>
              <circle cx={n.x} cy={n.y} r={22} fill={fill} stroke={stroke} strokeWidth={isBottleneck || isSource || isSink ? 2 : 1.5}
                filter={isBottleneck ? 'url(#glow)' : undefined}
              />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#F8FAFC" fontFamily="JetBrains Mono, monospace">
                {n.label.length > 6 ? n.label.slice(0, 6) : n.label}
              </text>
              {(isSource || isSink || isBottleneck) && (
                <g transform={`translate(${n.x}, ${n.y + 34})`}>
                  <text textAnchor="middle" fontSize="9" fill={isBottleneck ? '#EF6B76' : isSource ? '#2A9D8F' : '#F4A261'} fontWeight="600">
                    {isBottleneck ? '◆ 瓶颈' : isSource ? '● 源点' : '● 汇点'}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-neutral-200">
        <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-cyan rounded" /><span>有流边</span></div>
        <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent-red rounded" /><span>瓶颈边</span></div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-accent-red" /><span>瓶颈节点</span></div>
      </div>
    </div>
  );
}
