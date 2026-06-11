import { useMemo, useState } from 'react';
import type { WindProfilePoint } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { formatWindDir } from '@/utils/formatters';

interface Props {
  points: WindProfilePoint[];
}

const WIDTH = 560;
const HEIGHT = 420;
const PAD_L = 56;
const PAD_R = 24;
const PAD_T = 28;
const PAD_B = 44;

export function WindProfileChart({ points }: Props) {
  const { selectedPointId, selectedRecordId, selectPoint, selectRecord } = useAppStore();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { sorted, xScale, yScale, maxSpeed, maxHeight } = useMemo(() => {
    const norm = points.map((p) => ({ ...p, normHeight: normalizeHeight(p) }));
    const sorted = [...norm].sort((a, b) => a.normHeight - b.normHeight);
    const maxSpeed = Math.max(...sorted.map((p) => p.windSpeed), 12);
    const maxHeight = Math.max(...sorted.map((p) => p.normHeight), 80);
    const plotW = WIDTH - PAD_L - PAD_R;
    const plotH = HEIGHT - PAD_T - PAD_B;
    const xScale = (v: number) => PAD_L + (v / maxSpeed) * plotW;
    const yScale = (v: number) => PAD_T + plotH - (v / maxHeight) * plotH;
    return { sorted, xScale, yScale, maxSpeed, maxHeight };
  }, [points]);

  const pathD = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.windSpeed).toFixed(1)} ${yScale(p.normHeight).toFixed(1)}`)
    .join(' ');

  const xTicks = [0, 4, 8, 12].filter((v) => v <= maxSpeed);
  const yTicks = [0, 20, 40, 60, 80].filter((v) => v <= maxHeight);

  return (
    <div className="bg-white rounded border border-ocean-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-ocean-100">
        <div className="flex items-center gap-2">
          <h2 className="font-serif font-semibold text-ocean-700 text-sm">风速剖面</h2>
          <span className="text-[11px] text-ocean-400 font-mono">风速(m/s) × 高度(已换算)</span>
        </div>
        <div className="text-[11px] text-ocean-400">点击红色三角追溯异常点</div>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" style={{ maxHeight: 460 }}>
          <defs>
            <linearGradient id="profileFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.02" />
            </linearGradient>
            <filter id="blinkGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={PAD_L} y1={yScale(t)} x2={WIDTH - PAD_R} y2={yScale(t)} stroke="#E2E8F0" strokeDasharray="3 3" />
              <text x={PAD_L - 8} y={yScale(t) + 3} textAnchor="end" fontSize="10" fill="#64748B" fontFamily="JetBrains Mono, monospace">
                {t}m
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line x1={xScale(t)} y1={PAD_T} x2={xScale(t)} y2={HEIGHT - PAD_B} stroke="#F1F5F9" />
              <text x={xScale(t)} y={HEIGHT - PAD_B + 16} textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="JetBrains Mono, monospace">
                {t}
              </text>
            </g>
          ))}

          <line x1={PAD_L} y1={HEIGHT - PAD_B} x2={WIDTH - PAD_R} y2={HEIGHT - PAD_B} stroke="#94A3B8" />
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={HEIGHT - PAD_B} stroke="#94A3B8" />
          <text x={(PAD_L + WIDTH - PAD_R) / 2} y={HEIGHT - 6} textAnchor="middle" fontSize="11" fill="#0B3D5B" fontFamily="Noto Serif SC, serif">
            风速 →
          </text>
          <text x={12} y={(PAD_T + HEIGHT - PAD_B) / 2} textAnchor="middle" fontSize="11" fill="#0B3D5B" fontFamily="Noto Serif SC, serif" transform={`rotate(-90 12 ${(PAD_T + HEIGHT - PAD_B) / 2})`}>
            高度 ↑
          </text>

          <path
            d={`${pathD} L ${xScale(0)} ${yScale(sorted[sorted.length - 1].normHeight)} L ${xScale(0)} ${yScale(sorted[0].normHeight)} Z`}
            fill="url(#profileFill)"
          />
          <path
            d={pathD}
            fill="none"
            stroke="#0D9488"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="2000"
            className="animate-draw-line"
          />

          {sorted.map((p) => {
            const cx = xScale(p.windSpeed);
            const cy = yScale(p.normHeight);
            const isSelected = selectedPointId === p.id || (p.linkedRecordId && selectedRecordId === p.linkedRecordId);
            const isHover = hoverId === p.id;
            const scale = isSelected || isHover ? 1.5 : 1;

            if (p.isAnomaly) {
              const size = 7 * scale;
              return (
                <g key={p.id} style={{ cursor: 'pointer' }}
                   onClick={() => {
                     selectPoint(p.id);
                     if (p.linkedRecordId) selectRecord(p.linkedRecordId);
                   }}
                   onMouseEnter={() => setHoverId(p.id)}
                   onMouseLeave={() => setHoverId(null)}
                   filter={isSelected ? 'url(#blinkGlow)' : undefined}>
                  <polygon
                    points={`${cx},${cy - size} ${cx - size * 0.9},${cy + size * 0.7} ${cx + size * 0.9},${cy + size * 0.7}`}
                    fill="#E5484D"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className={isSelected ? 'animate-blink-3' : ''}
                  />
                  {(isSelected || isHover) && (
                    <g>
                      <rect x={cx + 8} y={cy - 36} width="150" height="30" rx="3" fill="#0B3D5B" opacity="0.95" />
                      <text x={cx + 14} y={cy - 22} fill="#fff" fontSize="10" fontFamily="JetBrains Mono, monospace">
                        {p.id}  {p.windSpeed.toFixed(1)}m/s  {formatWindDir(p.windDirection)}
                      </text>
                      <text x={cx + 14} y={cy - 10} fill="#FDE8E9" fontSize="10">
                        异常 · {p.height}{p.heightUnit} → {Math.round(p.normHeight)}m
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            return (
              <g key={p.id} style={{ cursor: 'pointer' }}
                 onClick={() => { selectPoint(p.id); selectRecord(p.linkedRecordId ?? null); }}
                 onMouseEnter={() => setHoverId(p.id)}
                 onMouseLeave={() => setHoverId(null)}>
                <circle cx={cx} cy={cy} r={4 * scale} fill="#fff" stroke="#0D9488" strokeWidth="1.8" />
                <circle cx={cx} cy={cy} r={2 * scale} fill="#0D9488" opacity={isSelected || isHover ? 1 : 0.5} />
                {isHover && (
                  <g>
                    <rect x={cx + 8} y={cy - 22} width="140" height="18" rx="3" fill="#0B3D5B" opacity="0.95" />
                    <text x={cx + 14} y={cy - 9} fill="#fff" fontSize="10" fontFamily="JetBrains Mono, monospace">
                      {p.id}  {p.windSpeed.toFixed(1)}m/s  {p.height}{p.heightUnit}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function normalizeHeight(p: WindProfilePoint): number {
  if (p.heightUnit === 'm') return p.height;
  return p.height * 3;
}
