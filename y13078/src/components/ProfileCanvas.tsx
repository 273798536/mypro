import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  getPointColor, pointMatchesFilters, isPointInOverlap,
  typeLabel, statusLabel, formatDate, regionOfCabinet,
} from '@/utils/helpers';
import type { Point, Cabinet } from '../../shared/types';

const CANVAS_W = 1100;
const CANVAS_H = 900;

export default function ProfileCanvas() {
  const {
    points, cabinets, overlaps, filters,
    selectedPointId, hoverPointId,
    setSelectedPoint, setHoverPoint,
    zoom, panX, panY, setViewTransform,
  } = useAppStore();

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let zoomLocal = zoom;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      zoomLocal = Math.max(0.4, Math.min(2.2, zoomLocal + delta));
      setViewTransform(zoomLocal, panX, panY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [panX, panY, setViewTransform, zoom]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX, panY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / zoom;
    const dy = (e.clientY - dragRef.current.startY) / zoom;
    setViewTransform(
      zoom,
      dragRef.current.panX + dx,
      dragRef.current.panY + dy,
    );
  };
  const onMouseUp = () => { dragRef.current = null; };

  const visiblePoints = points.filter(p => pointMatchesFilters(p, filters));

  return (
    <div
      ref={wrapRef}
      className="flex-1 h-full relative overflow-hidden cold-bg-gradient cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg
        id="profile-canvas"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="absolute inset-0 w-full h-full transition-transform duration-400 ease-out"
        style={{
          transform: `translate(-50%, -50%) scale(${zoom}) translate(${panX}px, ${panY}px)`,
          transformOrigin: 'center center',
          left: '50%',
          top: '50%',
        }}
      >
        <defs>
          <linearGradient id="cabinetGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E3A5F" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="cabinetTopGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cabinetBottomGlow" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>
          <pattern id="gridP" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E293B" strokeWidth="1" />
          </pattern>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#gridP)" opacity="0.4" />

        <g>
          <text x="70" y="70" className="fill-cold-accent/60" fontSize="12" fontFamily="JetBrains Mono">
            ↓ COLD AIRFLOW (冷气流下降) · 冷通道剖面示意
          </text>
        </g>

        {cabinets.map(cab => (
          <CabinetGlyph key={cab.id} cab={cab} />
        ))}

        {Array.from({ length: 18 }).map((_, i) => (
          <rect
            key={`flow-${i}`}
            x={CANVAS_W / 2 - 180 + (i % 6) * 60}
            y={CANVAS_H - 20}
            width="22"
            height={`${180 + (i % 3) * 40}`}
            rx="11"
            fill="rgba(6, 182, 212, 0.14)"
            style={{
              animation: `cold-flow 4s linear infinite`,
              animationDelay: `${i * 0.25}s`,
            }}
          />
        ))}

        {visiblePoints.map(p => (
          <PointMark
            key={p.id}
            p={p}
            isOverlap={isPointInOverlap(p.id, overlaps)}
            isSelected={p.id === selectedPointId}
            isHover={p.id === hoverPointId}
            onSelect={() => setSelectedPoint(p.id === selectedPointId ? null : p.id)}
            onHover={(h) => setHoverPoint(h ? p.id : null)}
          />
        ))}

        <Legend />
      </svg>

      <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-[10px] text-slate-400 font-mono-data bg-slate-900/70 border border-cold-border px-2.5 py-1.5 rounded-[2px] backdrop-blur-sm">
        <div>缩放: {Math.round(zoom * 100)}%</div>
        <div>平移: X {panX.toFixed(0)} / Y {panY.toFixed(0)}</div>
        <div className="text-slate-500">滚轮缩放 · 拖拽平移 · 点击点位查看</div>
      </div>
    </div>
  );
}

function CabinetGlyph({ cab }: { cab: Cabinet }) {
  const region = regionOfCabinet(cab.id);
  return (
    <g
      style={{ transform: 'perspective(800px) rotateY(1.2deg)' }}
      transform={`translate(${cab.x}, ${cab.y})`}
    >
      <rect
        x="0" y="0"
        width={cab.width} height={cab.height}
        fill="url(#cabinetGrad)"
        stroke="#334155" strokeWidth="1.5"
        rx="3"
      />
      <rect x="0" y="0" width={cab.width} height="12" fill="url(#cabinetTopGlow)" rx="3" />
      <rect x="0" y={cab.height - 18} width={cab.width} height="18" fill="url(#cabinetBottomGlow)" />

      {Array.from({ length: Math.floor(cab.height / 22) - 1 }).map((_, i) => (
        <rect
          key={i}
          x="10"
          y={24 + i * 22}
          width={cab.width - 20}
          height="14"
          fill="#1E293B"
          stroke="#475569"
          strokeWidth="0.5"
          rx="1"
          opacity={0.7 + (i % 3) * 0.1}
        />
      ))}

      <g transform={`translate(${cab.width / 2}, 14)`}>
        <circle cx="0" cy="0" r="2.5" fill={region === 'A' ? '#06B6D4' : '#F59E0B'} />
        <text
          x="0" y="4"
          textAnchor="middle"
          fontSize="10"
          fill="#E2E8F0"
          fontFamily="JetBrains Mono"
          fontWeight="600"
        >
          {cab.label}
        </text>
      </g>

      <text
        x={cab.width / 2}
        y={cab.height + 16}
        textAnchor="middle"
        fontSize="9"
        fill="#64748B"
        fontFamily="JetBrains Mono"
      >
        {cab.id}
      </text>

      <text
        x="8"
        y={cab.height + 16}
        fontSize="8"
        fill={region === 'A' ? '#06B6D4' : '#F59E0B'}
        fontFamily="JetBrains Mono"
        opacity="0.8"
      >
        [{region}区]
      </text>
    </g>
  );
}

function PointMark({
  p, isOverlap, isSelected, isHover, onSelect, onHover,
}: {
  p: Point;
  isOverlap: boolean;
  isSelected: boolean;
  isHover: boolean;
  onSelect: () => void;
  onHover: (h: boolean) => void;
}) {
  const color = getPointColor(p);
  const statusInfo = statusLabel[p.status];

  return (
    <g
      transform={`translate(${p.x}, ${p.y})`}
      className="cursor-pointer"
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{ transition: 'transform 0.15s ease-out' }}
    >
      {isOverlap && (
        <circle
          r="18"
          fill="none"
          stroke="#EF4444"
          strokeWidth="2"
          opacity="0.7"
          className="origin-center"
          style={{ animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}
        />
      )}
      {p.isBadData && (
        <rect
          x="-12" y="-12" width="24" height="24"
          fill="none" stroke="#EF4444" strokeWidth="1.5"
          strokeDasharray="3 2" rx="2"
          opacity="0.9"
        />
      )}
      {p.withdrawn && (
        <circle r="14" fill="none" stroke="#64748B" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.6" />
      )}

      <circle
        r={isSelected ? 9 : isHover ? 8 : 6.5}
        fill={p.withdrawn ? '#334155' : color}
        stroke={isSelected ? '#fff' : p.withdrawn ? '#64748B' : '#0F172A'}
        strokeWidth={isSelected ? 2.5 : 1.8}
        filter={isSelected ? 'url(#softGlow)' : undefined}
        style={{ transition: 'all 0.15s ease-out' }}
      />

      <g transform={`translate(10, -10)`}>
        <rect
          x="0" y="-9"
          width={p.isBadData ? 58 : 52} height="14"
          rx="2"
          fill={isSelected ? '#1E293B' : '#0F172ACC'}
          stroke={isSelected ? '#2563EB' : '#334155'}
          strokeWidth="1"
        />
        <text
          x="5" y="1"
          fontSize="9"
          fontFamily="JetBrains Mono"
          fill={p.withdrawn ? '#64748B' : '#E2E8F0'}
          style={{ textDecoration: p.withdrawn ? 'line-through' : 'none' }}
        >
          {p.id}
        </text>
        {p.isBadData && p.originalRow && (
          <text
            x="36" y="1"
            fontSize="8"
            fontFamily="JetBrains Mono"
            fill="#EF4444"
            className="origin-left"
            style={{ animation: 'blink-tag 1.2s ease-in-out infinite' }}
          >
            R{p.originalRow}
          </text>
        )}
      </g>

      <circle cx="-8" cy="-8" r="2.5" className={statusInfo.dot} />

      {isHover && (
        <g transform="translate(16, 4)">
          <rect x="0" y="0" width="170" height="60" rx="2"
            fill="#0F172AF2" stroke="#334155" strokeWidth="1" />
          <text x="8" y="14" fontSize="10" fill="#F1F5F9" fontFamily="JetBrains Mono" fontWeight="600">
            {p.id} · {typeLabel[p.type]}
          </text>
          <text x="8" y="28" fontSize="9" fill="#94A3B8">
            坐标 ({p.x}, {p.y}) · {p.cabinetId}
          </text>
          <text x="8" y="42" fontSize="9" className={statusInfo.color}>
            ● {statusInfo.text}
            {p.isBadData && ' · 坏数据'}
            {p.withdrawn && ' · 已撤回'}
          </text>
          <text x="8" y="54" fontSize="8.5" fill="#CBD5E1">
            更新 {formatDate(p.updatedAt)}
          </text>
        </g>
      )}
    </g>
  );
}

function Legend() {
  const items = [
    { c: '#10B981', t: '正常/传感器' },
    { c: '#06B6D4', t: '插座/正常' },
    { c: '#3B82F6', t: '交换机' },
    { c: '#F59E0B', t: '预警' },
    { c: '#EF4444', t: '故障/坏数据' },
    { c: '#64748B', t: '已撤回' },
  ];
  return (
    <g transform={`translate(${CANVAS_W - 185}, ${CANVAS_H - 160})`}>
      <rect width="175" height={items.length * 18 + 28} rx="3"
        fill="rgba(15, 23, 42, 0.85)" stroke="#1E293B" strokeWidth="1" />
      <text x="12" y="20" fontSize="10" fill="#94A3B8" fontFamily="JetBrains Mono" fontWeight="600">
        图例 LEGEND
      </text>
      {items.map((it, i) => (
        <g key={it.t} transform={`translate(12, ${40 + i * 18})`}>
          <circle cx="5" cy="-3" r="5" fill={it.c} opacity="0.85" />
          <text x="18" y="0" fontSize="10" fill="#CBD5E1" fontFamily="Noto Sans SC">{it.t}</text>
        </g>
      ))}
    </g>
  );
}
