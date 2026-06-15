import { useMemo, useState, useRef, useEffect } from 'react';
import { usePointStore } from '@/store/usePointStore';
import { lngLatToSvg, computeBounds } from '@/utils/geoTransform';
import { statusLabels, sourceTypeLabels } from '@/types';
import type { FirePoint } from '@/types';

const statusColors = {
  normal: '#43A047',
  abnormal: '#E53935',
  confirmed: '#2E7D32',
  pending: '#FFA726',
};

const statusPulse = {
  abnormal: true,
  pending: true,
  normal: false,
  confirmed: false,
};

interface HoveredPoint {
  point: FirePoint;
  x: number;
  y: number;
}

export default function MapView() {
  const { getFilteredPoints, selectPoint, selectedPointId, getPointSources } = usePointStore();
  const points = getFilteredPoints();
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);
  const [svgSize, setSvgSize] = useState({ width: 600, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => {
    if (points.length === 0) {
      return { minLng: 0, maxLng: 1, minLat: 0, maxLat: 1 };
    }
    return computeBounds(points);
  }, [points]);

  const pointPositions = useMemo(() => {
    return points.map((point) => {
      const pos = lngLatToSvg(
        point.lng,
        point.lat,
        bounds,
        svgSize.width,
        svgSize.height,
        50
      );
      return { point, x: pos.x, y: pos.y };
    });
  }, [points, bounds, svgSize]);

  const streetLines = useMemo(() => {
    if (points.length < 2) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const sorted = [...pointPositions].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Math.abs(sorted[i].y - sorted[i + 1].y) < 100) {
        lines.push({
          x1: sorted[i].x,
          y1: sorted[i].y,
          x2: sorted[i + 1].x,
          y2: sorted[i + 1].y,
        });
      }
    }
    return lines;
  }, [pointPositions]);

  const handlePointClick = (point: FirePoint) => {
    selectPoint(selectedPointId === point.id ? null : point.id);
  };

  const sourcesOfPoint = hoveredPoint
    ? getPointSources(hoveredPoint.point.id)
    : [];

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setSvgSize({ width: rect.width, height: 500 });
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative"
      onMouseLeave={() => setHoveredPoint(null)}
    >
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-medium text-slate-800">GIS点位分布图</h3>
        <div className="flex gap-3 text-xs">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-600">{statusLabels[status as keyof typeof statusLabels]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: '500px' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="bg-gradient-to-br from-slate-50 to-slate-100"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="0.5"
              />
            </pattern>
            {Object.entries(statusPulse)
              .filter(([, pulse]) => pulse)
              .map(([status]) => (
                <filter key={status} id={`glow-${status}`}>
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {streetLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#cbd5e1"
              strokeWidth="12"
              strokeLinecap="round"
            />
          ))}
          {streetLines.map((line, i) => (
            <line
              key={`center-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#f8fafc"
              strokeWidth="2"
              strokeDasharray="8,6"
              strokeLinecap="round"
            />
          ))}

          {pointPositions.map(({ point, x, y }) => {
            const isSelected = selectedPointId === point.id;
            const color = statusColors[point.status];
            const pulse = statusPulse[point.status];

            return (
              <g
                key={point.id}
                className="cursor-pointer"
                onClick={() => handlePointClick(point)}
                onMouseEnter={() => setHoveredPoint({ point, x, y })}
              >
                {pulse && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="8"
                      fill={color}
                      opacity="0.3"
                    >
                      <animate
                        attributeName="r"
                        from="8"
                        to="20"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.5"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill={color}
                      opacity="0.15"
                    >
                      <animate
                        attributeName="r"
                        from="14"
                        to="28"
                        dur="2s"
                        begin="0.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.3"
                        to="0"
                        dur="2s"
                        begin="0.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 12 : 9}
                  fill={color}
                  stroke="white"
                  strokeWidth={isSelected ? 3 : 2}
                  filter={pulse ? `url(#glow-${point.status})` : undefined}
                  className="transition-all duration-200"
                />

                <text
                  x={x}
                  y={y - 14}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                  fontWeight="500"
                >
                  {point.name}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-slate-200 p-3 pointer-events-none z-10 min-w-[200px]"
            style={{
              left: `${(hoveredPoint.x / svgSize.width) * 100}%`,
              top: `${(hoveredPoint.y / svgSize.height) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <p className="font-medium text-slate-800 text-sm mb-1">
              {hoveredPoint.point.name}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {hoveredPoint.point.address}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusColors[hoveredPoint.point.status] }}
              />
              <span className="text-xs text-slate-600">
                {statusLabels[hoveredPoint.point.status]}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              口径：{hoveredPoint.point.currentValue}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1">数据来源：</p>
              {sourcesOfPoint.map((s) => (
                <p key={s.id} className="text-xs text-slate-600">
                  • {sourceTypeLabels[s.type]}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white px-4 py-2 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          提示：点击点位查看详细信息，异常点位会有红色呼吸动画
        </p>
      </div>
    </div>
  );
}
