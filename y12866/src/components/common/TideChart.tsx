import type { TideRecord } from '@/types';

interface Props {
  records: TideRecord[];
  highlightTime?: string;
  width?: number;
  height?: number;
}

export default function TideChart({ records, highlightTime, width = 600, height = 200 }: Props) {
  if (records.length === 0) return null;

  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allHeights = records.map(r => r.height);
  const minH = Math.floor(Math.min(...allHeights));
  const maxH = Math.ceil(Math.max(...allHeights));
  const hRange = maxH - minH || 1;

  const points = records.map((r, i) => {
    const x = padding.left + (i / (records.length - 1)) * chartW;
    const y = padding.top + chartH - ((r.height - minH) / hRange) * chartH;
    return { x, y, record: r };
  });

  let highlightPoint = null;
  if (highlightTime) {
    const idx = records.findIndex(r => r.time.includes(highlightTime.substring(11, 16)));
    if (idx >= 0) highlightPoint = points[idx];
  }

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {[minH, (minH + maxH) / 2, maxH].map((h, i) => {
        const y = padding.top + chartH - ((h - minH) / hRange) * chartH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
              {h.toFixed(1)}m
            </text>
          </g>
        );
      })}

      <path d={areaD} fill="url(#tideGrad)" />
      <path d={pathD} fill="none" stroke="#2DD4BF" strokeWidth="2.5" strokeLinejoin="round" />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={p.record.type === 'high' ? '#0A3D6B' : '#64748B'} stroke="white" strokeWidth="2" />
          <text x={p.x} y={height - 8} textAnchor="middle" className="text-[9px] fill-slate-500 font-mono">
            {p.record.time.substring(11, 16)}
          </text>
        </g>
      ))}

      {highlightPoint && (
        <g>
          <line x1={highlightPoint.x} y1={padding.top} x2={highlightPoint.x} y2={padding.top + chartH} stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx={highlightPoint.x} cy={highlightPoint.y} r="7" fill="#EF4444" stroke="white" strokeWidth="2">
            <animate attributeName="r" values="7;9;7" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <rect x={highlightPoint.x - 50} y={highlightPoint.y - 28} width="100" height="20" rx="4" fill="#EF4444" />
          <text x={highlightPoint.x} y={highlightPoint.y - 14} textAnchor="middle" className="text-[10px] fill-white font-mono">
            {highlightPoint.record.height.toFixed(1)}m {highlightPoint.record.type === 'high' ? '高潮' : '低潮'}
          </text>
        </g>
      )}
    </svg>
  );
}
