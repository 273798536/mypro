import { useMemo } from 'react';
import { Camera, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { usePanZoom } from '@/hooks/usePanZoom';
import { BeatNode, Lane } from '@/types';
import { useProductionStore } from '@/store/productionStore';

const LANE_HEIGHT = 96;
const LANE_HEADER_WIDTH = 128;
const PIXELS_PER_MINUTE = 2.2;
const CHART_PADDING_TOP = 56;

function nodeColor(node: BeatNode): string {
  switch (node.anomalyType) {
    case 'need_material':
      return '#F59E0B';
    case 'need_caliber':
      return '#E11D48';
    default:
      return '#A7F3D0';
  }
}

function hitBadge(result: BeatNode['hitDetectionResult']) {
  switch (result) {
    case 'passed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />;
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-rose-300" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-amber-300" />;
  }
}

export function LaneChart() {
  const { productionData, selectedNodeId, selectNode, recentHitNodeIds } = useProductionStore();
  const { state, containerRef, handlers, zoomIn, zoomOut, reset } = usePanZoom({
    scale: 1,
    offsetX: 24,
    offsetY: 16,
  });

  const totalWidth = useMemo(
    () => LANE_HEADER_WIDTH + productionData.totalDuration * PIXELS_PER_MINUTE + 48,
    [productionData.totalDuration]
  );
  const totalHeight = useMemo(
    () => CHART_PADDING_TOP + productionData.lanes.length * LANE_HEIGHT + 40,
    [productionData.lanes.length]
  );

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = 60;
    for (let t = 0; t <= productionData.totalDuration; t += step) {
      markers.push(t);
    }
    return markers;
  }, [productionData.totalDuration]);

  const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/60 bg-slate-900/50">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          {productionData.name}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700/60 transition"
          >
            −
          </button>
          <span className="px-2 text-xs text-slate-400 w-14 text-center tabular-nums">
            {Math.round(state.scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700/60 transition"
          >
            +
          </button>
          <button
            onClick={reset}
            className="ml-2 px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700/60 transition"
          >
            重置
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        {...handlers}
        className="flex-1 relative overflow-hidden bg-[#0F2F3C] cursor-grab active:cursor-grabbing select-none"
      >
        <svg
          width={totalWidth}
          height={totalHeight}
          style={{
            transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
            transformOrigin: '0 0',
            transition: 'transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        >
          <defs>
            <pattern id="grid" width={60 * PIXELS_PER_MINUTE} height={LANE_HEIGHT} patternUnits="userSpaceOnUse">
              <path
                d={`M ${60 * PIXELS_PER_MINUTE} 0 L 0 0 0 ${LANE_HEIGHT}`}
                fill="none"
                stroke="rgba(148, 163, 184, 0.08)"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect x={LANE_HEADER_WIDTH} y={0} width={totalWidth - LANE_HEADER_WIDTH} height={totalHeight} fill="url(#grid)" />

          {timeMarkers.map((t) => (
            <g key={t}>
              <line
                x1={LANE_HEADER_WIDTH + t * PIXELS_PER_MINUTE}
                y1={CHART_PADDING_TOP - 20}
                x2={LANE_HEADER_WIDTH + t * PIXELS_PER_MINUTE}
                y2={totalHeight - 20}
                stroke="rgba(148, 163, 184, 0.15)"
                strokeDasharray="2 6"
              />
              <text
                x={LANE_HEADER_WIDTH + t * PIXELS_PER_MINUTE}
                y={CHART_PADDING_TOP - 28}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                {formatTime(t)}
              </text>
            </g>
          ))}

          {productionData.lanes.map((lane: Lane, idx: number) => {
            const laneY = CHART_PADDING_TOP + idx * LANE_HEIGHT;
            return (
              <g key={lane.id}>
                <rect
                  x={0}
                  y={laneY}
                  width={totalWidth}
                  height={LANE_HEIGHT}
                  fill={idx % 2 === 0 ? 'rgba(15, 47, 60, 0.4)' : 'rgba(15, 47, 60, 0.7)'}
                />
                <line x1={0} y1={laneY} x2={totalWidth} y2={laneY} stroke="rgba(148, 163, 184, 0.18)" />
                <rect
                  x={0}
                  y={laneY}
                  width={LANE_HEADER_WIDTH}
                  height={LANE_HEIGHT}
                  fill="rgba(30, 41, 59, 0.85)"
                />
                <text
                  x={16}
                  y={laneY + LANE_HEIGHT / 2 + 5}
                  fill="#cbd5e1"
                  fontSize="13"
                  fontWeight={600}
                  style={{ fontFamily: '"Noto Serif SC", serif' }}
                >
                  {lane.name}
                </text>

                {lane.nodes.map((node) => {
                  const nx = LANE_HEADER_WIDTH + node.startTime * PIXELS_PER_MINUTE;
                  const ny = laneY + 18;
                  const nw = Math.max(node.duration * PIXELS_PER_MINUTE - 8, 80);
                  const nh = LANE_HEIGHT - 36;
                  const isSelected = selectedNodeId === node.id;
                  const isFlashing = recentHitNodeIds.includes(node.id);
                  const strokeDash = node.hitDetectionResult !== 'passed' ? '4 3' : undefined;

                  return (
                    <g
                      key={node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectNode(isSelected ? null : node.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isFlashing && (
                        <rect
                          x={nx - 4}
                          y={ny - 4}
                          width={nw + 8}
                          height={nh + 8}
                          rx={10}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          opacity={0.8}
                        >
                          <animate attributeName="opacity" from="0.9" to="0" dur="0.8s" />
                        </rect>
                      )}
                      <rect
                        x={nx}
                        y={ny}
                        width={nw}
                        height={nh}
                        rx={8}
                        fill={nodeColor(node)}
                        fillOpacity={isSelected ? 0.95 : 0.78}
                        stroke={isSelected ? '#ffffff' : node.hitDetectionResult === 'failed' ? '#f87171' : 'rgba(255,255,255,0.18)'}
                        strokeWidth={isSelected ? 2.5 : 1.2}
                        strokeDasharray={strokeDash}
                      />
                      <text
                        x={nx + 12}
                        y={ny + 24}
                        fill="#0F172A"
                        fontSize="12"
                        fontWeight={600}
                        style={{ fontFamily: '"Noto Sans SC", sans-serif', pointerEvents: 'none' }}
                      >
                        {node.title}
                      </text>
                      <g transform={`translate(${nx + 12}, ${ny + 44})`} style={{ pointerEvents: 'none' }}>
                        <foreignObject x={0} y={0} width={20} height={20}>
                          <div className="flex items-center">{hitBadge(node.hitDetectionResult)}</div>
                        </foreignObject>
                        {node.hasScreenshot && (
                          <foreignObject x={26} y={0} width={20} height={20}>
                            <div className="flex items-center">
                              <Camera className="w-3.5 h-3.5 text-slate-700" />
                            </div>
                          </foreignObject>
                        )}
                        <text x={node.hasScreenshot ? 52 : 26} y={13} fill="#1e293b" fontSize="10">
                          {node.duration} 分钟
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <line x1={0} y1={CHART_PADDING_TOP - 1} x2={totalWidth} y2={CHART_PADDING_TOP - 1} stroke="rgba(148, 163, 184, 0.4)" />
        </svg>

        <div className="absolute bottom-3 left-4 text-[11px] text-slate-400/80 pointer-events-none">
          滚轮缩放 · 拖拽平移 · 点击节点查看明细
        </div>
      </div>
    </div>
  );
}
