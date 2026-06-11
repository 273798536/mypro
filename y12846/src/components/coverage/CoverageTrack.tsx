import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';
import { Info, MousePointer2 } from 'lucide-react';
import type { PrimerPair, CoverageRegion, Mutation } from '@/lib/utils/types';
import { cn } from '@/lib/utils';

interface CoverageTrackProps {
  referenceLength: number;
  primerPairs: PrimerPair[];
  coverage: CoverageRegion[];
  mutations: Mutation[];
  onPrimerClick?: (primerPair: PrimerPair) => void;
  className?: string;
}

interface TooltipState {
  x: number;
  y: number;
  content: React.ReactNode;
  visible: boolean;
}

const STATUS_COLORS: Record<PrimerPair['status'], string> = {
  valid: '#26DE81',
  warning: '#FD9644',
  invalid: '#EB3B5A',
  needs_review: '#369bff',
};

const HEIGHT = 200;
const PADDING = { top: 40, right: 20, bottom: 40, left: 60 };

export default function CoverageTrack({
  referenceLength,
  primerPairs,
  coverage,
  mutations,
  onPrimerClick,
  className,
}: CoverageTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: null, visible: false });
  const [hoveredPrimer, setHoveredPrimer] = useState<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const xScale = useMemo(() => {
    return scaleLinear()
      .domain([0, referenceLength])
      .range([PADDING.left, width - PADDING.right]);
  }, [referenceLength, width]);

  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const trackY = PADDING.top + innerHeight * 0.3;
  const trackHeight = innerHeight * 0.4;

  const tickValues = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.pow(10, Math.floor(Math.log10(referenceLength / 5)));
    for (let i = 0; i <= referenceLength; i += step) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== referenceLength) {
      ticks.push(referenceLength);
    }
    return ticks;
  }, [referenceLength]);

  const primerColor = (primer: PrimerPair) => STATUS_COLORS[primer.status];

  const formatPosition = (pos: number) => {
    if (pos >= 1000) return `${(pos / 1000).toFixed(1)}kb`;
    return `${pos}bp`;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, primer: PrimerPair) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 10,
      content: (
        <div className="space-y-1">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{primer.name}</div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            位置: {formatPosition(primer.ampliconStart)} - {formatPosition(primer.ampliconEnd)}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            产物大小: {primer.productSize}bp
          </div>
          {primer.batch && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">批次: {primer.batch}</div>
          )}
          <div className="text-xs capitalize" style={{ color: primerColor(primer) }}>
            状态: {primer.status.replace('_', ' ')}
          </div>
        </div>
      ),
      visible: true,
    });
    setHoveredPrimer(primer.id);
  };

  const handleMutationHover = (e: React.MouseEvent<SVGGElement>, mutation: Mutation) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + 12,
      y: e.clientY - rect.top - 10,
      content: (
        <div className="space-y-1">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100">
            {mutation.refBase} → {mutation.altBase}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            位置: {formatPosition(mutation.position)}
          </div>
          {mutation.alleleFrequency !== undefined && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              频率: {(mutation.alleleFrequency * 100).toFixed(1)}%
            </div>
          )}
          {mutation.quality !== undefined && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              质量: {mutation.quality}
            </div>
          )}
        </div>
      ),
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ x: 0, y: 0, content: null, visible: false });
    setHoveredPrimer(null);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="mb-3 flex items-center gap-2">
        <Info className="h-4 w-4 text-neutral-500" />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          全基因组覆盖轨道图谱 · 参考序列长度: {formatPosition(referenceLength)}
        </span>
      </div>

      <svg width={width} height={HEIGHT} className="overflow-visible">
        <defs>
          <pattern id="gapPattern" patternUnits="userSpaceOnUse" width="8" height="8">
            <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#EB3B5A" strokeWidth="1.5" fill="none" opacity="0.6" />
          </pattern>
        </defs>

        {tickValues.map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              y1={PADDING.top - 8}
              x2={xScale(tick)}
              y2={HEIGHT - PADDING.bottom + 8}
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeDasharray="2,4"
            />
            <text
              x={xScale(tick)}
              y={HEIGHT - PADDING.bottom + 24}
              textAnchor="middle"
              className="fill-neutral-500"
              fontSize="10"
            >
              {formatPosition(tick)}
            </text>
          </g>
        ))}

        <line
          x1={PADDING.left}
          y1={trackY + trackHeight / 2}
          x2={width - PADDING.right}
          y2={trackY + trackHeight / 2}
          stroke="#a1a1aa"
          strokeWidth="2"
        />

        {coverage.filter((c) => c.isGap).map((gap, i) => (
          <rect
            key={`gap-${i}`}
            x={xScale(gap.start)}
            y={trackY}
            width={Math.max(xScale(gap.end) - xScale(gap.start), 2)}
            height={trackHeight}
            fill="url(#gapPattern)"
            rx="2"
          />
        ))}

        {primerPairs.map((primer, index) => {
          const x = xScale(primer.ampliconStart);
          const w = Math.max(xScale(primer.ampliconEnd) - xScale(primer.ampliconStart), 4);
          const row = index % 3;
          const y = trackY - 10 - row * 18;
          const h = 12;

          return (
            <g key={primer.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={primerColor(primer)}
                rx="2"
                className={cn(
                  'cursor-pointer transition-all duration-150',
                  hoveredPrimer === primer.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                )}
                style={{
                  filter: hoveredPrimer === primer.id ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                }}
                onMouseMove={(e) => handleMouseMove(e, primer)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onPrimerClick?.(primer)}
              />
              {hoveredPrimer === primer.id && (
                <line
                  x1={x + w / 2}
                  y1={y + h}
                  x2={x + w / 2}
                  y2={trackY}
                  stroke={primerColor(primer)}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              )}
            </g>
          );
        })}

        {mutations.map((mutation) => {
          const x = xScale(mutation.position);
          return (
            <g key={mutation.id} className="cursor-pointer" onMouseMove={(e) => handleMutationHover(e, mutation)} onMouseLeave={handleMouseLeave}>
              <line
                x1={x}
                y1={trackY - 5}
                x2={x}
                y2={trackY + trackHeight + 5}
                stroke="#EB3B5A"
                strokeWidth="2"
              />
              <circle cx={x} cy={trackY + trackHeight + 10} r="4" fill="#EB3B5A" />
            </g>
          );
        })}

        <text x={PADDING.left - 8} y={trackY + trackHeight / 2} textAnchor="end" dominantBaseline="middle" className="fill-neutral-600" fontSize="11">
          参考序列
        </text>

        <g transform={`translate(${PADDING.left}, ${PADDING.top - 20})`}>
          {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map((status, i) => (
            <g key={status} transform={`translate(${i * 110}, 0)`}>
              <rect x="0" y="0" width="12" height="12" rx="2" fill={STATUS_COLORS[status]} />
              <text x="18" y="10" className="fill-neutral-600 dark:text-neutral-400" fontSize="10">
                {status.replace('_', ' ')}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}

      {onPrimerClick && (
        <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500">
          <MousePointer2 className="h-3 w-3" />
          <span>点击引物区间查看详情</span>
        </div>
      )}
    </div>
  );
}
