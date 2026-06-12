import { Point } from '@/types';

interface Props {
  points: Point[] | null;
  hull?: Point[];
  width?: number;
  height?: number;
}

export default function ConvexHullVisual({ points, hull, width = 480, height = 360 }: Props) {
  const padding = 40;

  if (!points || points.length === 0) {
    return (
      <svg width={width} height={height} className="bg-paper-50 border border-paper-200 rounded">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-ink-600 text-sm">
          空集合 · 无点可绘制
        </text>
      </svg>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - 1;
  const maxX = Math.max(...xs) + 1;
  const minY = Math.min(...ys) - 1;
  const maxY = Math.max(...ys) + 1;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const sx = (x: number) => padding + ((x - minX) / rangeX) * (width - padding * 2);
  const sy = (y: number) => height - padding - ((y - minY) / rangeY) * (height - padding * 2);

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const x = padding + (i / 4) * (width - padding * 2);
    const y = padding + (i / 4) * (height - padding * 2);
    gridLines.push(<line key={`vx-${i}`} x1={x} y1={padding} x2={x} y2={height - padding} stroke="#e8e4d8" strokeDasharray="2 4" />);
    gridLines.push(<line key={`hy-${i}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e8e4d8" strokeDasharray="2 4" />);
  }

  const hullPath = hull && hull.length >= 3
    ? 'M ' + hull.map((p) => `${sx(p.x)} ${sy(p.y)}`).join(' L ') + ' Z'
    : '';

  return (
    <svg width={width} height={height} className="bg-white border border-paper-200 rounded">
      {gridLines}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e3a5f" strokeWidth={1.2} />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#1e3a5f" strokeWidth={1.2} />
      <text x={width - padding} y={height - padding + 16} textAnchor="end" className="fill-ink-600 text-[10px]">X</text>
      <text x={padding - 12} y={padding + 4} textAnchor="middle" className="fill-ink-600 text-[10px]">Y</text>

      {hullPath && (
        <path d={hullPath} fill="rgba(30, 58, 95, 0.08)" stroke="#1e3a5f" strokeWidth={1.5} strokeLinejoin="round" />
      )}

      {points.map((p, i) => (
        <g key={`pt-${i}`}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill="#1e3a5f" />
          <text x={sx(p.x) + 6} y={sy(p.y) - 6} className="fill-ink-700 text-[10px] font-mono">
            ({p.x},{p.y})
          </text>
        </g>
      ))}

      {hull && hull.map((p, i) => (
        <circle key={`hull-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={6} fill="none" stroke="#d97706" strokeWidth={2} />
      ))}
    </svg>
  );
}
