import type { ShipTrackPoint } from '@/types';

interface Props {
  points: ShipTrackPoint[];
}

export default function ShipTrackMap({ points }: Props) {
  const minLat = Math.min(...points.map(p => p.lat)) - 0.02;
  const maxLat = Math.max(...points.map(p => p.lat)) + 0.02;
  const minLng = Math.min(...points.map(p => p.lng)) - 0.02;
  const maxLng = Math.max(...points.map(p => p.lng)) + 0.02;

  const width = 600;
  const height = 300;
  const pad = 40;

  const toSvg = (lat: number, lng: number) => ({
    x: pad + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * pad),
    y: pad + ((maxLat - lat) / (maxLat - minLat)) * (height - 2 * pad),
  });

  const svgPoints = points.map(p => ({ ...p, svg: toSvg(p.lat, p.lng) }));

  const pathD = svgPoints
    .map((p, i) => (i === 0 ? `M ${p.svg.x} ${p.svg.y}` : `L ${p.svg.x} ${p.svg.y}`))
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="water-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#F0F9FF" />
          <path d="M0 10 Q5 8 10 10 Q15 12 20 10" fill="none" stroke="#BAE6FD" strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>

      <rect width={width} height={height} fill="url(#water-pattern)" rx="8" />

      {svgPoints.map((p, i) => {
        if (i === 0) return null;
        const prev = svgPoints[i - 1];
        return (
          <line key={`line-${i}`} x1={prev.svg.x} y1={prev.svg.y} x2={p.svg.x} y2={p.svg.y} stroke="#0A3D6B" strokeWidth="2" strokeDasharray="6 3" opacity="0.6" />
        );
      })}

      {svgPoints.map((p, i) => (
        <g key={p.id}>
          {i === svgPoints.length - 1 ? (
            <g>
              <circle cx={p.svg.x} cy={p.svg.y} r="10" fill="#EF4444" opacity="0.2">
                <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={p.svg.x} cy={p.svg.y} r="6" fill="#EF4444" stroke="white" strokeWidth="2" />
            </g>
          ) : (
            <circle cx={p.svg.x} cy={p.svg.y} r="4" fill="#0A3D6B" stroke="white" strokeWidth="1.5" />
          )}

          <text x={p.svg.x} y={p.svg.y - 12} textAnchor="middle" className="text-[9px] fill-ocean-800 font-mono">
            {p.timestamp.substring(11, 16)}
          </text>

          {p.speed === 0 && (
            <text x={p.svg.x + 14} y={p.svg.y + 4} className="text-[8px] fill-red-600 font-medium">
              靠泊
            </text>
          )}

          {p.note && (
            <g>
              <rect x={p.svg.x + 12} y={p.svg.y - 8} width={Math.max(p.note.length * 9, 40)} height="18" rx="4" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="0.5" />
              <text x={p.svg.x + 18} y={p.svg.y + 4} className="text-[9px] fill-amber-800">
                📝 {p.note}
              </text>
            </g>
          )}
        </g>
      ))}

      <text x={width - pad} y={height - 10} textAnchor="end" className="text-[9px] fill-slate-400">
        船舶轨迹示意图（含人工备注）
      </text>
    </svg>
  );
}
