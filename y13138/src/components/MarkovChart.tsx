import { useRef } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useParamStore } from '@/store/paramStore';
import { useTraceStore } from '@/store/traceStore';
import type { MarkovNode, MarkovEdge } from '@/types';

interface AbnormalTagProps {
  node: MarkovNode;
  threshold: number;
  isThresholdFromSlider: boolean;
}

function AbnormalTag({ node, threshold, isThresholdFromSlider }: AbnormalTagProps) {
  return (
    <g transform={`translate(${node.x + 50}, ${node.y - 50})`}>
      <rect
        x={0}
        y={0}
        width={240}
        height={48}
        rx={2}
        fill="#fff1f1"
        stroke="#a4161a"
        strokeWidth={1.5}
      />
      <polygon points="0,14 -10,20 0,26" fill="#a4161a" />
      <text x={8} y={16} fontSize={10} fontFamily="'Noto Serif SC', serif" fill="#a4161a" fontWeight={600}>
        ⚠️ 边界样本不足
      </text>
      <text x={8} y={30} fontSize={9} fontFamily="'JetBrains Mono', monospace" fill="#a4161a">
        n={node.sampleCount} {'<'} θ={threshold}（见P-07）{isThresholdFromSlider ? '（滑块）' : ''}
      </text>
      <text x={8} y={42} fontSize={9} fontFamily="'JetBrains Mono', monospace" fill="#7f1012">
        原文："有效样本低于此值，外推结果不可靠"
      </text>
    </g>
  );
}

interface OverflowTagProps {
  node: MarkovNode;
}
function OverflowTag({ node }: OverflowTagProps) {
  return (
    <g transform={`translate(${node.x - 180}, ${node.y + 40})`}>
      <rect
        x={0}
        y={0}
        width={170}
        height={36}
        rx={2}
        fill="#fff4dc"
        stroke="#c46a1b"
        strokeWidth={1.5}
      />
      <text x={8} y={14} fontSize={9.5} fontFamily="'Noto Serif SC', serif" fill="#c46a1b" fontWeight={600}>
        ⚡ 外推越界（见P-08）
      </text>
      <text x={8} y={28} fontSize={8.5} fontFamily="'JetBrains Mono', monospace" fill="#8a4a10">
        t=120min 时P接近1.0上界
      </text>
    </g>
  );
}

interface NodeComponentProps {
  node: MarkovNode;
  selected: boolean;
  hovered: boolean;
}
function NodeComponent({ node, selected, hovered }: NodeComponentProps) {
  const { selectNode, setHoverNode } = useChartStore();
  const { buildTraceFromNode, setRightTab } = useTraceStore();
  const nodes = useChartStore((s) => s.nodes);
  const paramRows = useParamStore((s) => s.groups[s.activeGroupId].rows);

  const ringColor = node.isAbnormal ? '#a4161a' : selected ? '#1e2a5a' : '#2d6a4f';
  const fillColor = hovered || selected
    ? (node.isAbnormal ? '#ffe5e5' : '#e6ecff')
    : '#ffffff';
  const strokeW = selected ? 3.5 : node.isAbnormal ? 3 : 2;

  return (
    <g
      className="cursor-pointer"
      onClick={() => {
        selectNode(node.id);
        buildTraceFromNode(node.id, nodes, paramRows);
        setRightTab('trace');
      }}
      onMouseEnter={() => setHoverNode(node.id)}
      onMouseLeave={() => setHoverNode(null)}
    >
      {node.isAbnormal && (
        <circle
          className="node-pulse-ring"
          cx={node.x}
          cy={node.y}
          r={48}
          fill="none"
          stroke="#a4161a"
          strokeWidth={2}
          opacity={0.5}
        />
      )}
      <circle
        cx={node.x}
        cy={node.y}
        r={40}
        fill={fillColor}
        stroke={ringColor}
        strokeWidth={strokeW}
        style={{ transition: 'all 0.2s ease' }}
      />
      <circle
        cx={node.x + 12}
        cy={node.y - 25}
        r={12}
        fill={node.isAbnormal ? '#a4161a' : '#1e2a5a'}
        stroke="#fff"
        strokeWidth={1.5}
      />
      <text
        x={node.x + 12}
        y={node.y - 21}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#ffffff"
        fontFamily="'JetBrains Mono', monospace"
      >
        {node.romanLabel}
      </text>
      <text
        x={node.x}
        y={node.y - 8}
        textAnchor="middle"
        fontSize={14}
        fontWeight={600}
        fill="#1e2a5a"
        fontFamily="'Noto Serif SC', serif"
      >
        {node.displayName}
      </text>
      <text
        x={node.x}
        y={node.y + 10}
        textAnchor="middle"
        fontSize={10}
        fill="#1e2a5a"
        fontFamily="'JetBrains Mono', monospace"
      >
        π={(node.steadyProb * 100).toFixed(1)}%
      </text>
      <text
        x={node.x}
        y={node.y + 24}
        textAnchor="middle"
        fontSize={9}
        fill={node.isAbnormal ? '#a4161a' : '#1e2a5a'}
        fontFamily="'JetBrains Mono', monospace"
      >
        n={node.sampleCount} {node.isAbnormal && '⚠️'}
      </text>
    </g>
  );
}

interface EdgeComponentProps {
  edge: MarkovEdge;
  nodeMap: Record<string, MarkovNode>;
  selected: boolean;
}
function EdgeComponent({ edge, nodeMap, selected }: EdgeComponentProps) {
  const { selectEdge } = useChartStore();
  const from = nodeMap[edge.from];
  const to = nodeMap[edge.to];
  if (!from || !to) return null;

  const isSelf = edge.from === edge.to;
  const color = edge.probability > 0.3
    ? '#1e2a5a'
    : edge.probability > 0.1
    ? '#2d6a4f'
    : '#a4161a';
  const strokeDasharray = edge.probability < 0.1 ? '4 3' : undefined;
  const strokeWidth = selected ? 3 : 1 + edge.probability * 3;

  if (isSelf) {
    const cx = from.x;
    const cy = from.y;
    const r = 44;
    const d = `M ${cx - r * 0.8} ${cy - r * 0.6}
               C ${cx - r * 1.8} ${cy - r * 1.8}, ${cx + r * 1.8} ${cy - r * 1.8}, ${cx + r * 0.8} ${cy - r * 0.6}`;
    const midX = cx;
    const midY = cy - r * 1.5;
    return (
      <g className="cursor-pointer" onClick={() => selectEdge(selected ? null : edge.id)}>
        <path
          d={d}
          fill="none"
          stroke={selected ? '#c46a1b' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd="url(#arrowhead)"
        />
        <text
          x={midX}
          y={midY - 2}
          textAnchor="middle"
          fontSize={10}
          fontFamily="'JetBrains Mono', monospace"
          fill={selected ? '#c46a1b' : color}
          fontWeight={600}
        >
          {edge.probability.toFixed(2)}
        </text>
      </g>
    );
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;
  const ny = dy / dist;
  const startX = from.x + nx * 44;
  const startY = from.y + ny * 44;
  const endX = to.x - nx * 44;
  const endY = to.y - ny * 44;

  const perpX = -ny;
  const perpY = nx;
  const curveFactor = 18;
  const midX = (startX + endX) / 2 + perpX * curveFactor;
  const midY = (startY + endY) / 2 + perpY * curveFactor;

  const d = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

  const t = 0.5;
  const labelX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
  const labelY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
  const offX = perpX * 10;
  const offY = perpY * 10;

  return (
    <g className="cursor-pointer" onClick={() => selectEdge(selected ? null : edge.id)}>
      <path
        d={d}
        fill="none"
        stroke={selected ? '#c46a1b' : color}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd="url(#arrowhead)"
        opacity={0.85}
      />
      <rect
        x={labelX + offX - 20}
        y={labelY + offY - 8}
        width={40}
        height={16}
        rx={2}
        fill="#f5f1e8"
        stroke={selected ? '#c46a1b' : color}
        strokeWidth={0.8}
        opacity={0.95}
      />
      <text
        x={labelX + offX}
        y={labelY + offY + 4}
        textAnchor="middle"
        fontSize={10}
        fontFamily="'JetBrains Mono', monospace"
        fill={selected ? '#c46a1b' : color}
        fontWeight={600}
      >
        {edge.probability.toFixed(2)}
      </text>
    </g>
  );
}

interface LegendProps {}
function Legend() {
  return (
    <g transform="translate(20, 370)">
      <rect x={0} y={0} width={240} height={78} rx={2} fill="#ffffff" stroke="#1e2a5a" strokeWidth={1} opacity={0.95} />
      <text x={8} y={16} fontSize={10.5} fontFamily="'Noto Serif SC', serif" fill="#1e2a5a" fontWeight={600}>
        图例 Legend
      </text>
      <circle cx={16} cy={32} r={7} fill="#ffffff" stroke="#2d6a4f" strokeWidth={2} />
      <text x={30} y={35} fontSize={9.5} fontFamily="'Noto Serif SC', serif" fill="#1e2a5a">
        正常节点（n ≥ θ）
      </text>
      <circle cx={140} cy={32} r={7} fill="#ffe5e5" stroke="#a4161a" strokeWidth={3} />
      <text x={154} y={35} fontSize={9.5} fontFamily="'Noto Serif SC', serif" fill="#a4161a">
        异常节点（n {'<'} θ）
      </text>

      <line x1={6} y1={50} x2={30} y2={50} stroke="#1e2a5a" strokeWidth={2.5} markerEnd="url(#arrowhead)" />
      <text x={36} y={53} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#1e2a5a">
        主转移（P≥0.3）
      </text>
      <line x1={110} y1={50} x2={134} y2={50} stroke="#2d6a4f" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
      <text x={140} y={53} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#2d6a4f">
        次转移（0.1≤P{'<'}0.3）
      </text>
      <line x1={6} y1={68} x2={30} y2={68} stroke="#a4161a" strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#arrowhead)" />
      <text x={36} y={71} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#a4161a">
        弱转移（P{'<'}0.1 样本稀少）
      </text>
    </g>
  );
}

export default function MarkovChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodes = useChartStore((s) => s.nodes);
  const edges = useChartStore((s) => s.edges);
  const selectedNodeId = useChartStore((s) => s.selectedNodeId);
  const selectedEdgeId = useChartStore((s) => s.selectedEdgeId);
  const hoverNodeId = useChartStore((s) => s.hoverNodeId);
  const activeGroupLabel = useParamStore((s) => s.groups[s.activeGroupId].label);
  const boundaryThreshold = useParamStore((s) => s.boundaryThreshold);
  const isThresholdFromSlider = boundaryThreshold !== 5;

  const nodeMap: Record<string, MarkovNode> = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div ref={containerRef} className="h-full w-full paper-grid-bg relative flex flex-col items-stretch">
      <div className="px-5 pt-3 pb-2">
        <div className="text-[11px] mono text-academic-navy/60">
          {activeGroupLabel} · 状态转移图 State Transition Diagram
        </div>
        <div className="font-serif text-sm text-academic-navy/80 mt-0.5">
          点击节点追溯异常 → 查看参数引用 → 回到原始材料
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center overflow-auto custom-scroll">
        <svg width={760} height={470} viewBox="0 0 760 470" style={{ maxWidth: '100%' }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>

          <rect x={0} y={0} width={760} height={470} fill="transparent" />

          {edges.map((e) => (
            <EdgeComponent
              key={e.id}
              edge={e}
              nodeMap={nodeMap}
              selected={e.id === selectedEdgeId}
            />
          ))}

          {nodes.map((n) => (
            <NodeComponent
              key={n.id}
              node={n}
              selected={n.id === selectedNodeId}
              hovered={n.id === hoverNodeId}
            />
          ))}

          {nodes.map((n) =>
            n.isAbnormal ? (
              <AbnormalTag
                key={`abn-${n.id}`}
                node={n}
                threshold={boundaryThreshold}
                isThresholdFromSlider={isThresholdFromSlider}
              />
            ) : null,
          )}
          {nodes.map((n) =>
            n.overflowWarning ? <OverflowTag key={`ovf-${n.id}`} node={n} /> : null,
          )}

          <Legend />

          {selectedNode && (
            <g transform="translate(280, 370)">
              <rect
                x={0}
                y={0}
                width={460}
                height={78}
                rx={2}
                fill={selectedNode.isAbnormal ? '#fff5f5' : '#eef2ff'}
                stroke={selectedNode.isAbnormal ? '#a4161a' : '#1e2a5a'}
                strokeWidth={1.5}
              />
              <text x={10} y={16} fontSize={11} fontFamily="'Noto Serif SC', serif" fill="#1e2a5a" fontWeight={700}>
                📍 当前选中：{selectedNode.romanLabel} {selectedNode.displayName}（节点{selectedNode.id}）
              </text>
              <text x={10} y={32} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#1e2a5a">
                初始 π₀ = {(selectedNode.initialProb * 100).toFixed(1)}%  →  稳态 π̄ = {(selectedNode.steadyProb * 100).toFixed(1)}%   样本量 n = {selectedNode.sampleCount}
              </text>
              <text x={10} y={46} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#1e2a5a">
                引用参数：{selectedNode.relatedParamIds.join(', ')}　关联记录：{selectedNode.relatedRecordIds.join(', ')}
              </text>
              {selectedNode.abnormalReason && (
                <text x={10} y={62} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#a4161a">
                  ⚠️ {selectedNode.abnormalReason}
                </text>
              )}
              {selectedNode.overflowWarning && !selectedNode.abnormalReason && (
                <text x={10} y={62} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fill="#c46a1b">
                  ⚡ {selectedNode.overflowWarning}
                </text>
              )}
              <text x={10} y={72} fontSize={8.5} fontFamily="'Noto Serif SC', serif" fill="#1e2a5a/60">
                👉 右侧「溯源链路」面板可一路点回原始材料
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
