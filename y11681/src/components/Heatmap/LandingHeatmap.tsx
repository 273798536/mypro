import { useMemo } from 'react';
import { useRecordStore } from '@/store/useRecordStore';
import { COURSE_BOUNDARY } from '@/physics/constants';
import { ZoomIn } from 'lucide-react';

export function LandingHeatmap() {
  const { records, selectedCompareIds } = useRecordStore();

  const landingPoints = useMemo(() => {
    return records.map((r) => ({
      x: r.result.landing.x,
      z: r.result.landing.z,
      selected: selectedCompareIds.includes(r.id),
    }));
  }, [records, selectedCompareIds]);

  if (landingPoints.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ZoomIn size={14} className="text-golf-green" />
          <h3 className="text-sm font-semibold text-golf-green">落点热区</h3>
        </div>
        <div className="text-xs text-gray-500 text-center py-8">
          保存训练记录后显示落点分布
        </div>
      </div>
    );
  }

  const width = 200;
  const height = 150;
  const padding = 20;
  const xRange = COURSE_BOUNDARY.maxX - COURSE_BOUNDARY.minX;
  const zRange = COURSE_BOUNDARY.maxZ - COURSE_BOUNDARY.minZ;

  const toCanvasX = (x: number) =>
    padding + ((x - COURSE_BOUNDARY.minX) / xRange) * (width - 2 * padding);
  const toCanvasZ = (z: number) =>
    padding + ((COURSE_BOUNDARY.maxZ - z) / zRange) * (height - 2 * padding);

  return (
    <div className="glass-panel rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ZoomIn size={14} className="text-golf-green" />
        <h3 className="text-sm font-semibold text-golf-green">落点热区</h3>
        <span className="text-xs text-gray-500 ml-auto">{landingPoints.length} 个落点</span>
      </div>
      <div className="relative bg-golf-dark rounded-lg overflow-hidden">
        <svg width={width} height={height} className="w-full h-auto">
          <rect
            x={padding}
            y={padding}
            width={width - 2 * padding}
            height={height - 2 * padding}
            fill="#1a472a"
            stroke="#32E0C4"
            strokeWidth={0.5}
          />
          <rect
            x={toCanvasX(-8)}
            y={toCanvasZ(COURSE_BOUNDARY.maxZ - 20)}
            width={toCanvasX(8) - toCanvasX(-8)}
            height={toCanvasZ(COURSE_BOUNDARY.maxZ - 28) - toCanvasZ(COURSE_BOUNDARY.maxZ - 20)}
            fill="#95d5b2"
          />
          {[50, 100, 150, 200, 250, 300].map((dist) => (
            <line
              key={dist}
              x1={padding}
              y1={toCanvasZ(dist)}
              x2={width - padding}
              y2={toCanvasZ(dist)}
              stroke="#ffffff"
              strokeWidth={0.3}
              strokeDasharray="2,4"
              opacity={0.3}
            />
          ))}
          {landingPoints.map((p, i) => {
            const cx = toCanvasX(p.x);
            const cy = toCanvasZ(p.z);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={p.selected ? '#FFC93C' : '#32E0C4'}
                  opacity={p.selected ? 1 : 0.6}
                />
                {p.selected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="none"
                    stroke="#FFC93C"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                )}
              </g>
            );
          })}
          <text x={padding - 5} y={toCanvasZ(COURSE_BOUNDARY.maxZ)} textAnchor="end" fill="#666" fontSize="8">
            0
          </text>
          <text x={padding - 5} y={toCanvasZ(200)} textAnchor="end" fill="#666" fontSize="8">
            200
          </text>
          <text x={padding - 5} y={toCanvasZ(COURSE_BOUNDARY.minZ + 10)} textAnchor="end" fill="#666" fontSize="8">
            400
          </text>
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-golf-green" />
          <span className="text-gray-500">普通落点</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-golf-warn" />
          <span className="text-gray-500">已选对比</span>
        </div>
      </div>
    </div>
  );
}
