import { useState, useMemo } from 'react';
import { Slice, Move, Eye, Maximize2, Grid3x3 } from 'lucide-react';
import type { DeviceCoordinate, Screenshot } from '../../../shared/types';
import { cn } from '@/lib/utils';

interface SectionViewerProps {
  coordinates: DeviceCoordinate[];
  screenshots: Screenshot[];
  conclusion?: string;
}

type Axis = 'x' | 'y' | 'z';

export default function SectionViewer({ coordinates, screenshots, conclusion }: SectionViewerProps) {
  const [axis, setAxis] = useState<Axis>('z');
  const [depth, setDepth] = useState(0.5);
  const [linkedHighlight, setLinkedHighlight] = useState<string | null>(null);

  const bounds = useMemo(() => {
    if (coordinates.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    coordinates.forEach((c) => {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.z < minZ) minZ = c.z;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
      if (c.z > maxZ) maxZ = c.z;
    });
    return {
      min: { x: minX - 0.5, y: minY - 0.5, z: minZ - 0.5 },
      max: { x: maxX + 0.5, y: maxY + 0.5, z: maxZ + 0.5 },
    };
  }, [coordinates]);

  const axisRange = bounds.max[axis] - bounds.min[axis];
  const cutValue = bounds.min[axis] + depth * axisRange;

  const sectionPoints = useMemo(() => {
    return coordinates
      .map((c) => {
        const dist = Math.abs(c[axis] - cutValue);
        const inSection = dist < axisRange * 0.08;
        return { coord: c, dist, inSection };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [coordinates, cutValue, axis, axisRange]);

  const linkedScreenshots = useMemo(() => {
    if (!linkedHighlight) return [];
    return screenshots.filter((s) => s.linkedCoordinateIds.includes(linkedHighlight));
  }, [linkedHighlight, screenshots]);

  const project2D = (c: DeviceCoordinate) => {
    const axes: Axis[] = ['x', 'y', 'z'];
    const otherAxes = axes.filter((a) => a !== axis) as [Axis, Axis];
    const [uAxis, vAxis] = otherAxes;
    const uRange = bounds.max[uAxis] - bounds.min[uAxis];
    const vRange = bounds.max[vAxis] - bounds.min[vAxis];
    const u = ((c[uAxis] - bounds.min[uAxis]) / uRange) * 360 + 20;
    const v = ((c[vAxis] - bounds.min[vAxis]) / vRange) * 280 + 20;
    return { u, v, uAxis, vAxis };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-lg border border-deep-space-600 bg-gradient-to-br from-deep-space-900 via-black to-deep-space-900 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-deep-space-600 bg-deep-space-800/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-ice-blue uppercase tracking-wider">
            <Slice size={14} />
            剖切视图 — {axis.toUpperCase()} 轴
          </div>
          <div className="flex items-center gap-1">
            {(['x', 'y', 'z'] as Axis[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAxis(a)}
                className={cn(
                  'px-2.5 py-1 text-xs font-mono rounded-md transition-colors',
                  axis === a
                    ? 'bg-ice-blue text-deep-space-900 shadow-glow-ice'
                    : 'bg-deep-space-700 text-deep-space-200 hover:bg-deep-space-600',
                )}
              >
                {a.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" style={{ height: 360 }}>
          <svg viewBox="0 0 400 320" className="w-full h-full">
            <defs>
              <radialGradient id="sectionGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(79, 195, 247, 0.25)" />
                <stop offset="100%" stopColor="rgba(79, 195, 247, 0)" />
              </radialGradient>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(47, 84, 150, 0.3)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="400" height="320" fill="url(#gridPattern)" />

            {sectionPoints.map(({ coord, inSection }) => {
              const { u, v } = project2D(coord);
              const isHighlighted = linkedHighlight === coord.id;
              return (
                <g key={coord.id}>
                  {inSection && (
                    <circle cx={u} cy={v} r={16} fill="url(#sectionGlow)" />
                  )}
                  <circle
                    cx={u}
                    cy={v}
                    r={isHighlighted ? 7 : inSection ? 5 : 3.5}
                    fill={isHighlighted ? '#FFB74D' : inSection ? '#4FC3F7' : '#6F8AB8'}
                    stroke={isHighlighted ? '#FFE0B2' : inSection ? '#B3E5FC' : 'transparent'}
                    strokeWidth={isHighlighted ? 2 : inSection ? 1.5 : 0}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => setLinkedHighlight(isHighlighted ? null : coord.id)}
                  />
                  <text
                    x={u + 10}
                    y={v + 3}
                    fontSize="9"
                    fill={inSection || isHighlighted ? '#E6EBF3' : '#6F8AB8'}
                    fontFamily="JetBrains Mono"
                  >
                    {coord.label}
                  </text>
                </g>
              );
            })}

            <line
              x1={axis === 'x' ? 20 + depth * 360 : 20}
              y1={axis === 'y' ? 300 - depth * 280 : 20}
              x2={axis === 'x' ? 20 + depth * 360 : 380}
              y2={axis === 'y' ? 300 - depth * 280 : 300}
              stroke="#FFB74D"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.8"
            />
          </svg>

          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] text-deep-space-300">
            <Grid3x3 size={12} />
            <span>剖切深度: {cutValue.toFixed(3)}</span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[10px] text-deep-space-300">
            <Eye size={12} />
            <span>点击坐标点查看关联截图</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-deep-space-600 bg-deep-space-800 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-ice-blue uppercase tracking-wider mb-3">
            <Move size={14} />
            剖切控制
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-deep-space-300 mb-1">
                <span>深度 ({axis.toUpperCase()})</span>
                <span className="font-mono text-ice-blue">{(depth * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={depth}
                onChange={(e) => setDepth(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-deep-space-900/60 p-2 border border-deep-space-600">
                <div className="text-deep-space-400 mb-0.5">剖切值</div>
                <div className="font-mono text-ice-blue">{cutValue.toFixed(4)}</div>
              </div>
              <div className="rounded bg-deep-space-900/60 p-2 border border-deep-space-600">
                <div className="text-deep-space-400 mb-0.5">范围内点</div>
                <div className="font-mono text-ice-blue">
                  {sectionPoints.filter((p) => p.inSection).length} / {coordinates.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-deep-space-600 bg-deep-space-800 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-warn uppercase tracking-wider mb-3">
            <Maximize2 size={14} />
            关联溯源
          </div>
          {linkedHighlight ? (
            <div className="space-y-2">
              <div className="rounded bg-deep-space-900/60 p-2.5 border border-amber-warn/30">
                <div className="text-xs text-deep-space-400">选中坐标点</div>
                <div className="font-mono text-amber-warn text-sm">
                  {coordinates.find((c) => c.id === linkedHighlight)?.label}
                </div>
              </div>
              {linkedScreenshots.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs text-deep-space-300">关联截图 ({linkedScreenshots.length})</div>
                  {linkedScreenshots.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded bg-deep-space-900/60 border border-deep-space-600 p-2 hover:border-ice-blue/40 transition-colors cursor-pointer"
                    >
                      <div className="h-8 w-10 rounded bg-deep-space-700 flex items-center justify-center text-[10px] text-deep-space-300">IMG</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-deep-space-100 truncate">{s.filename}</div>
                        <div className="text-[10px] text-deep-space-400">{s.timestampMs}ms</div>
                      </div>
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          s.reviewStatus === 'approved' && 'bg-green-pass',
                          s.reviewStatus === 'pending' && 'bg-amber-warn',
                          s.reviewStatus === 'rejected' && 'bg-red-reject',
                        )}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-deep-space-400 italic">暂无关联截图</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-deep-space-400 italic">请在左侧视图点击一个坐标点</div>
          )}
        </div>

        {conclusion && (
          <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-deep-space-800 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
              结论对照
            </div>
            <p className="text-xs text-deep-space-100 leading-relaxed whitespace-pre-wrap">{conclusion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
