import { useState, useRef, useEffect } from 'react';
import type { SectionParams, MeasurePoint } from '@shared/types';
import { cn } from '@/lib/utils';

interface SectionViewProps {
  params: SectionParams | null;
  points: MeasurePoint[];
  minClearanceRequired?: number;
  onSelectPoint?: (point: MeasurePoint) => void;
  selectedPointId?: string;
  className?: string;
}

interface LayoutConfig {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

const DEFAULT_LAYOUT: LayoutConfig = {
  width: 800,
  height: 600,
  paddingLeft: 80,
  paddingRight: 40,
  paddingTop: 40,
  paddingBottom: 60,
};

const COLORS = {
  ground: '#8B7355',
  slab: '#9CA3AF',
  beam: '#6B7280',
  pipe: '#3B82F6',
  ceiling: '#E5E7EB',
  grid: '#E5E7EB',
  axis: '#6B7280',
  normal: '#5FAD41',
  abnormal: '#DC2626',
  clearanceLine: '#E36414',
};

function getScaleForHeight(
  params: SectionParams | null,
  minClearance: number,
  layout: LayoutConfig
): number {
  if (!params) return 1;
  const totalHeight =
    params.slabThickness +
    params.beamHeight +
    params.pipeDiameter +
    params.ceilingThickness +
    Math.max(minClearance, 2200) +
    200;
  const available = layout.height - layout.paddingTop - layout.paddingBottom;
  return available / totalHeight;
}

export default function SectionView({
  params,
  points,
  minClearanceRequired = 2200,
  onSelectPoint,
  selectedPointId,
  className,
}: SectionViewProps) {
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateLayout() {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 600);
      const height = Math.max(rect.height, 600);
      setLayout({
        ...DEFAULT_LAYOUT,
        width,
        height,
      });
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const scale = getScaleForHeight(params, minClearanceRequired, layout);
  const innerWidth = layout.width - layout.paddingLeft - layout.paddingRight;
  const innerHeight = layout.height - layout.paddingTop - layout.paddingBottom;
  const groundY = layout.height - layout.paddingBottom;

  function yAt(distanceFromGroundMM: number): number {
    return groundY - distanceFromGroundMM * scale;
  }

  function xAt(position: number, total: number): number {
    if (total <= 1) return layout.paddingLeft + innerWidth / 2;
    return (
      layout.paddingLeft + 20 + (position / (total - 1)) * (innerWidth - 40)
    );
  }

  const sortedPoints = [...points].sort(
    (a, b) => (a.coordinate?.x ?? 0) - (b.coordinate?.x ?? 0)
  );

  return (
    <div
      ref={containerRef}
      className={cn('w-full bg-white rounded-lg border border-gray-200 overflow-hidden', className)}
      style={{ minHeight: 600 }}
    >
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern
            id="groundPattern"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="10" stroke={COLORS.ground} strokeWidth="3" opacity="0.3" />
          </pattern>
          <pattern
            id="ceilingPattern"
            patternUnits="userSpaceOnUse"
            width="20"
            height="10"
          >
            <rect width="20" height="10" fill={COLORS.ceiling} />
            <line x1="0" y1="0" x2="20" y2="0" stroke="#D1D5DB" strokeWidth="0.5" />
            <line x1="10" y1="0" x2="10" y2="10" stroke="#D1D5DB" strokeWidth="0.5" />
          </pattern>
          <filter id="pulseFilter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>
            {`
              @keyframes sectionPulse {
                0%, 100% { r: 6; opacity: 1; }
                50% { r: 10; opacity: 0.5; }
              }
              @keyframes sectionPulseRing {
                0% { r: 6; opacity: 0.6; }
                100% { r: 18; opacity: 0; }
              }
              .abnormal-pulse {
                animation: sectionPulse 1.5s ease-in-out infinite;
              }
              .abnormal-pulse-ring {
                animation: sectionPulseRing 1.5s ease-out infinite;
                transform-origin: center;
              }
            `}
          </style>
        </defs>

        {[0, 1, 2, 3, 4, 5].map((i) => {
          const mm = i * 500;
          return (
            <g key={`grid-${i}`}>
              <line
                x1={layout.paddingLeft}
                y1={yAt(mm)}
                x2={layout.width - layout.paddingRight}
                y2={yAt(mm)}
                stroke={COLORS.grid}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={layout.paddingLeft - 10}
                y={yAt(mm) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6B7280"
              >
                {mm}mm
              </text>
            </g>
          );
        })}

        <line
          x1={layout.paddingLeft}
          y1={yAt(0)}
          x2={layout.paddingLeft}
          y2={layout.paddingTop}
          stroke={COLORS.axis}
          strokeWidth="1.5"
        />
        <line
          x1={layout.paddingLeft}
          y1={yAt(0)}
          x2={layout.width - layout.paddingRight}
          y2={yAt(0)}
          stroke={COLORS.axis}
          strokeWidth="1.5"
        />

        {params && (
          <>
            <rect
              x={layout.paddingLeft}
              y={yAt(0)}
              width={innerWidth}
              height={30 * scale}
              fill="url(#groundPattern)"
            />
            <text
              x={layout.paddingLeft + innerWidth + 8}
              y={yAt(0) + 10}
              fontSize="11"
              fill={COLORS.ground}
              fontWeight="500"
            >
              地面 ±0.000
            </text>

            {sortedPoints.length > 0 &&
              sortedPoints.map((p, idx) => {
                const clearance = p.calculatedClearance;
                const cx = xAt(idx, sortedPoints.length);
                const cy = yAt(clearance);
                const isAbnormal = p.isAbnormal;
                const isSelected = selectedPointId === p.id;

                return (
                  <g
                    key={p.id}
                    onClick={() => onSelectPoint?.(p)}
                    className={cn('cursor-pointer', isAbnormal && 'group')}
                  >
                    {isAbnormal && (
                      <>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="6"
                          fill="none"
                          stroke={COLORS.abnormal}
                          strokeWidth="2"
                          className="abnormal-pulse-ring"
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r="6"
                          fill={COLORS.abnormal}
                          className="abnormal-pulse"
                          filter="url(#pulseFilter)"
                        />
                      </>
                    )}
                    {!isAbnormal && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        fill={COLORS.normal}
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isAbnormal ? 14 : 12}
                      fill="transparent"
                      className="hover:fill-black/5"
                    />
                    {(isSelected || isAbnormal) && (
                      <text
                        x={cx}
                        y={cy - (isAbnormal ? 16 : 12)}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isAbnormal ? COLORS.abnormal : COLORS.normal}
                        fontWeight="600"
                      >
                        {p.code}
                      </text>
                    )}
                  </g>
                );
              })}

            <g>
              <line
                x1={layout.paddingLeft}
                y1={yAt(minClearanceRequired)}
                x2={layout.width - layout.paddingRight}
                y2={yAt(minClearanceRequired)}
                stroke={COLORS.clearanceLine}
                strokeWidth="2"
                strokeDasharray="8 4"
              />
              <rect
                x={layout.width - layout.paddingRight - 120}
                y={yAt(minClearanceRequired) - 22}
                width="116"
                height="20"
                rx="3"
                fill={COLORS.clearanceLine}
              />
              <text
                x={layout.width - layout.paddingRight - 62}
                y={yAt(minClearanceRequired) - 8}
                textAnchor="middle"
                fontSize="11"
                fill="white"
                fontWeight="600"
              >
                最小净空 {minClearanceRequired}mm
              </text>
            </g>

            <g>
              <rect
                x={layout.paddingLeft}
                y={yAt(minClearanceRequired + params.ceilingThickness)}
                width={innerWidth}
                height={params.ceilingThickness * scale}
                fill="url(#ceilingPattern)"
              />
              <text
                x={layout.paddingLeft + innerWidth + 8}
                y={yAt(minClearanceRequired + params.ceilingThickness / 2) + 4}
                fontSize="11"
                fill="#6B7280"
                fontWeight="500"
              >
                吊顶 {params.ceilingThickness}mm
              </text>
            </g>

            <g>
              <rect
                x={layout.paddingLeft + innerWidth * 0.15}
                y={yAt(
                  minClearanceRequired +
                    params.ceilingThickness +
                    params.pipeDiameter
                )}
                width={innerWidth * 0.7}
                height={params.pipeDiameter * scale}
                rx={Math.min(12, (params.pipeDiameter * scale) / 2)}
                fill={COLORS.pipe}
                opacity="0.85"
              />
              <text
                x={layout.paddingLeft + innerWidth + 8}
                y={
                  yAt(
                    minClearanceRequired +
                      params.ceilingThickness +
                      params.pipeDiameter / 2
                  ) + 4
                }
                fontSize="11"
                fill={COLORS.pipe}
                fontWeight="500"
              >
                管线 Φ{params.pipeDiameter}mm
              </text>
            </g>

            <g>
              <rect
                x={layout.paddingLeft + innerWidth * 0.1}
                y={yAt(
                  minClearanceRequired +
                    params.ceilingThickness +
                    params.pipeDiameter +
                    params.beamHeight
                )}
                width={innerWidth * 0.8}
                height={params.beamHeight * scale}
                fill={COLORS.beam}
              />
              <text
                x={layout.paddingLeft + innerWidth + 8}
                y={
                  yAt(
                    minClearanceRequired +
                      params.ceilingThickness +
                      params.pipeDiameter +
                      params.beamHeight / 2
                  ) + 4
                }
                fontSize="11"
                fill={COLORS.beam}
                fontWeight="500"
              >
                梁高 {params.beamHeight}mm
              </text>
            </g>

            <g>
              <rect
                x={layout.paddingLeft}
                y={yAt(
                  minClearanceRequired +
                    params.ceilingThickness +
                    params.pipeDiameter +
                    params.beamHeight +
                    params.slabThickness
                )}
                width={innerWidth}
                height={params.slabThickness * scale}
                fill={COLORS.slab}
              />
              <text
                x={layout.paddingLeft + innerWidth + 8}
                y={
                  yAt(
                    minClearanceRequired +
                      params.ceilingThickness +
                      params.pipeDiameter +
                      params.beamHeight +
                      params.slabThickness / 2
                  ) + 4
                }
                fontSize="11"
                fill={COLORS.slab}
                fontWeight="500"
              >
                楼板 {params.slabThickness}mm
              </text>
            </g>

            <text
              x={layout.paddingLeft + innerWidth / 2}
              y={layout.height - 15}
              textAnchor="middle"
              fontSize="12"
              fill="#6B7280"
            >
              地下车库剖面示意图（共 {points.length} 个测点）
            </text>
          </>
        )}

        {!params && (
          <text
            x={layout.width / 2}
            y={layout.height / 2}
            textAnchor="middle"
            fontSize="14"
            fill="#9CA3AF"
          >
            暂无剖面参数
          </text>
        )}
      </svg>
    </div>
  );
}
