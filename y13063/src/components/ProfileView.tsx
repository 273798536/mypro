import { useMemo, useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { MOCK_POINTS } from '@/data/mockPoints';
import { FLAG_LABELS } from '@/types';
import type { MonitoringPoint } from '@/types';

const PADDING = { top: 40, right: 40, bottom: 40, left: 60 };
const WELL_X = 30;

export default function ProfileView() {
  const filterState = useAppStore((s) => s.filterState);
  const selectedId = useAppStore((s) => s.selectedPointId);
  const selectPoint = useAppStore((s) => s.selectPoint);
  const viewport = useAppStore((s) => s.viewport);
  const setViewport = useAppStore((s) => s.setViewport);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const draggingRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(
    null,
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    return MOCK_POINTS.filter((p) => {
      if (filterState.codes.length > 0 && !filterState.codes.includes(p.code)) return false;
      if (p.depth < filterState.minDepth || p.depth > filterState.maxDepth) return false;
      if (filterState.flags.length > 0) {
        const hit = filterState.flags.some((f) => p.flags.includes(f));
        if (!hit) return false;
      }
      return true;
    });
  }, [filterState]);

  const { xMin, xMax, dMin, dMax } = useMemo(() => {
    const all = MOCK_POINTS;
    const xs = all.map((p) => p.x);
    const ds = all.map((p) => p.depth);
    return {
      xMin: Math.min(...xs) - 10,
      xMax: Math.max(...xs) + 10,
      dMin: 0,
      dMax: Math.max(...ds) + 5,
    };
  }, []);

  const innerW = size.w - PADDING.left - PADDING.right;
  const innerH = size.h - PADDING.top - PADDING.bottom;

  function xToSvg(x: number) {
    return PADDING.left + ((x - xMin) / (xMax - xMin)) * innerW;
  }
  function dToSvg(d: number) {
    return PADDING.top + ((d - dMin) / (dMax - dMin)) * innerH;
  }

  function handleSvgWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const next = Math.min(3, Math.max(0.5, viewport.scale + delta));
    setViewport({ scale: next });
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      ox: viewport.offsetX,
      oy: viewport.offsetY,
    };
  }
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - draggingRef.current.startX;
    const dy = e.clientY - draggingRef.current.startY;
    setViewport({
      offsetX: draggingRef.current.ox + dx,
      offsetY: draggingRef.current.oy + dy,
    });
  }
  function handleMouseUp() {
    draggingRef.current = null;
  }

  const depthTicks = useMemo(() => {
    const ticks = [];
    for (let d = 0; d <= dMax; d += 10) ticks.push(d);
    return ticks;
  }, [dMax]);

  return (
    <div ref={containerRef} className="flex-1 relative bg-[#f6f1ec] overflow-hidden">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/80 backdrop-blur border border-brand-100 rounded-sm shadow-sm">
        <button
          className="p-1.5 text-brand-600 hover:bg-brand-50"
          onClick={() => setViewport({ scale: Math.min(3, viewport.scale + 0.2) })}
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 text-brand-600 hover:bg-brand-50"
          onClick={() => setViewport({ scale: Math.max(0.5, viewport.scale - 0.2) })}
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-brand-200" />
        <button
          className="p-1.5 text-brand-600 hover:bg-brand-50"
          onClick={() => setViewport({ scale: 1, offsetX: 0, offsetY: 0 })}
          title="重置视图"
        >
          <Move className="w-4 h-4" />
        </button>
        <span className="text-xs text-brand-500 px-2 border-l border-brand-100">
          {Math.round(viewport.scale * 100)}%
        </span>
      </div>

      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onWheel={handleSvgWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
      >
        <defs>
          <linearGradient id="wellGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e6ddd2" />
            <stop offset="50%" stopColor="#cdbfae" />
            <stop offset="100%" stopColor="#e6ddd2" />
          </linearGradient>
          <pattern
            id="grid"
            width={xToSvg(xMin + 10) - xToSvg(xMin)}
            height={dToSvg(10) - dToSvg(0)}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${xToSvg(xMin + 10) - xToSvg(xMin)} 0 L 0 0 0 ${dToSvg(10) - dToSvg(0)}`}
              fill="none"
              stroke="#e4d9cb"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <g
          transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}
          style={{ transformOrigin: 'center' }}
        >
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={innerW}
            height={innerH}
            fill="url(#grid)"
          />

          {depthTicks.map((d) => (
            <g key={d}>
              <line
                x1={PADDING.left}
                x2={size.w - PADDING.right}
                y1={dToSvg(d)}
                y2={dToSvg(d)}
                stroke="#d7cab8"
                strokeDasharray="3 3"
                strokeWidth="0.5"
              />
              <text
                x={PADDING.left - 8}
                y={dToSvg(d) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7a7f"
              >
                {d}m
              </text>
            </g>
          ))}

          <text
            x={PADDING.left - 44}
            y={size.h / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#0F4C5C"
            transform={`rotate(-90, ${PADDING.left - 44}, ${size.h / 2})`}
            fontWeight="600"
          >
            深度
          </text>
          <text
            x={size.w / 2}
            y={size.h - 8}
            textAnchor="middle"
            fontSize="12"
            fill="#0F4C5C"
            fontWeight="600"
          >
            水平距离 (m)
          </text>

          {[0, 50, 100, 150].map((xv) => (
            <text
              key={xv}
              x={xToSvg(xv)}
              y={PADDING.top - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7a7f"
            >
              {xv}
            </text>
          ))}

          {filtered.map((p: MonitoringPoint, idx: number) => {
            const cx = xToSvg(p.x);
            const cy = dToSvg(p.depth);
            const isAbnormal = p.flags.length > 0;
            const isSelected = selectedId === p.id;
            return (
              <g
                key={p.id}
                className="fade-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectPoint(isSelected ? null : p.id);
                }}
              >
                {p.flags.includes('merge_error') && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={22}
                    fill="none"
                    stroke="#9A031E"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 10 : 7}
                  fill={isAbnormal ? '#E36414' : '#5F8D4E'}
                  stroke={isSelected ? '#0F4C5C' : isAbnormal ? '#9A031E' : '#ffffff'}
                  strokeWidth={isSelected ? 3 : isAbnormal ? 2.5 : 2}
                  className={isAbnormal ? 'animate-breathe' : ''}
                  style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px` }}
                />
                <text
                  x={cx}
                  y={cy - (isAbnormal ? 18 : 14)}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#0F4C5C"
                >
                  {p.code}
                </text>
                {isAbnormal && (
                  <g>
                    {p.flags.slice(0, 2).map((f, i) => (
                      <text
                        key={f}
                        x={cx + 12 + i * 14}
                        y={cy + 5}
                        fontSize="13"
                      >
                        {FLAG_LABELS[f].emoji}
                      </text>
                    ))}
                  </g>
                )}
              </g>
            );
          })}

          <line
            x1={WELL_X}
            x2={WELL_X}
            y1={PADDING.top}
            y2={size.h - PADDING.bottom}
            stroke="#0F4C5C"
            strokeWidth="2.5"
            opacity="0.7"
          />
          <text
            x={WELL_X}
            y={PADDING.top - 8}
            textAnchor="middle"
            fontSize="11"
            fill="#0F4C5C"
            fontWeight="600"
          >
            井口
          </text>
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur border border-brand-100 rounded-sm shadow-sm px-3 py-2 text-xs text-brand-700 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-moss border-2 border-white" />
          <span>正常点位</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-amber border-2 border-accent-rust" />
          <span>异常点位</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-brand-500">滚轮缩放 · 拖拽平移 · 点击选中</span>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-brand-500 text-sm">当前筛选条件下无点位，请调整筛选。</div>
        </div>
      )}
    </div>
  );
}
