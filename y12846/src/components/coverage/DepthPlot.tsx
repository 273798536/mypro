import { useMemo, useRef, useState, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';
import { BarChart3, AlertTriangle } from 'lucide-react';
import type { CoverageRegion } from '@/lib/utils/types';
import { cn } from '@/lib/utils';

interface DepthPlotProps {
  referenceLength: number;
  coverage: CoverageRegion[];
  className?: string;
}

interface DepthDataPoint {
  position: number;
  depth: number;
  isGap: boolean;
}

const HEIGHT = 220;
const PADDING = { top: 40, right: 20, bottom: 40, left: 50 };
const RESOLUTION = 200;

export default function DepthPlot({
  referenceLength,
  coverage,
  className,
}: DepthPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  const depthData = useMemo((): DepthDataPoint[] => {
    const data: DepthDataPoint[] = [];
    const step = referenceLength / RESOLUTION;

    for (let i = 0; i < RESOLUTION; i++) {
      const pos = Math.round(i * step);
      let maxDepth = 0;
      let isGap = false;

      for (const region of coverage) {
        if (pos >= region.start && pos <= region.end) {
          if (region.isGap) {
            isGap = true;
          }
          maxDepth = Math.max(maxDepth, region.coverageDepth);
        }
      }

      data.push({ position: pos, depth: maxDepth, isGap });
    }

    return data;
  }, [referenceLength, coverage]);

  const maxDepth = useMemo(() => {
    const max = Math.max(...depthData.map((d) => d.depth), 1);
    return Math.ceil(max * 1.2);
  }, [depthData]);

  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const barWidth = innerWidth / RESOLUTION;

  const xScale = useMemo(() => {
    return scaleLinear()
      .domain([0, referenceLength])
      .range([PADDING.left, width - PADDING.right]);
  }, [referenceLength, width]);

  const yScale = useMemo(() => {
    return scaleLinear()
      .domain([0, maxDepth])
      .range([HEIGHT - PADDING.bottom, PADDING.top]);
  }, [maxDepth]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = Math.ceil(maxDepth / 5) || 1;
    for (let i = 0; i <= maxDepth; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxDepth]);

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

  const formatPosition = (pos: number) => {
    if (pos >= 1000) return `${(pos / 1000).toFixed(1)}kb`;
    return `${pos}bp`;
  };

  const gapCount = coverage.filter((c) => c.isGap).length;
  const avgDepth = depthData.length > 0
    ? depthData.reduce((sum, d) => sum + d.depth, 0) / depthData.length
    : 0;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-neutral-500" />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">覆盖深度图</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-neutral-500">
            平均深度: <span className="font-medium text-neutral-700 dark:text-neutral-300">{avgDepth.toFixed(1)}x</span>
          </span>
          {gapCount > 0 && (
            <span className="flex items-center gap-1 text-danger-600">
              <AlertTriangle className="h-3 w-3" />
              {gapCount} 个缺口区域
            </span>
          )}
        </div>
      </div>

      <svg width={width} height={HEIGHT} className="overflow-visible">
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PADDING.left}
              y1={yScale(tick)}
              x2={width - PADDING.right}
              y2={yScale(tick)}
              stroke="#f4f4f5"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-neutral-500"
              fontSize="10"
            >
              {tick}x
            </text>
          </g>
        ))}

        {tickValues.map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={xScale(tick)}
              y1={PADDING.top}
              x2={xScale(tick)}
              y2={HEIGHT - PADDING.bottom}
              stroke="#f4f4f5"
              strokeWidth="1"
            />
            <text
              x={xScale(tick)}
              y={HEIGHT - PADDING.bottom + 20}
              textAnchor="middle"
              className="fill-neutral-500"
              fontSize="10"
            >
              {formatPosition(tick)}
            </text>
          </g>
        ))}

        {depthData.map((d, i) => {
          const barHeight = innerHeight - (yScale(d.depth) - PADDING.top);
          const x = PADDING.left + i * barWidth;
          const y = yScale(d.depth);
          const isHovered = hoveredIndex === i;
          const color = d.depth === 0 || d.isGap ? '#EB3B5A' : d.depth === 1 ? '#FD9644' : '#26DE81';

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth - 0.5, 1)}
                height={Math.max(barHeight, 0)}
                fill={color}
                opacity={isHovered ? 1 : 0.85}
                rx="1"
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {isHovered && (
                <>
                  <line
                    x1={x + barWidth / 2}
                    y1={PADDING.top}
                    x2={x + barWidth / 2}
                    y2={HEIGHT - PADDING.bottom}
                    stroke="#52525b"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <rect
                    x={x + barWidth / 2 - 50}
                    y={y - 40}
                    width="100"
                    height="32"
                    rx="4"
                    fill="#27272a"
                    opacity="0.95"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 25}
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {formatPosition(d.position)}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={y - 13}
                    textAnchor="middle"
                    fill={color}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {d.depth}x 覆盖{d.isGap ? ' · 缺口' : ''}
                  </text>
                </>
              )}
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          y1={HEIGHT - PADDING.bottom}
          x2={width - PADDING.right}
          y2={HEIGHT - PADDING.bottom}
          stroke="#d4d4d8"
          strokeWidth="1"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={HEIGHT - PADDING.bottom}
          stroke="#d4d4d8"
          strokeWidth="1"
        />

        <text
          x={PADDING.left - 35}
          y={PADDING.top + innerHeight / 2}
          textAnchor="middle"
          className="fill-neutral-600"
          fontSize="11"
          transform={`rotate(-90, ${PADDING.left - 35}, ${PADDING.top + innerHeight / 2})`}
        >
          覆盖深度
        </text>

        <g transform={`translate(${PADDING.left}, ${HEIGHT - PADDING.bottom + 32})`}>
          <g>
            <rect x="0" y="0" width="12" height="12" rx="2" fill="#26DE81" />
            <text x="18" y="10" className="fill-neutral-600 dark:text-neutral-400" fontSize="10">正常覆盖 (≥2x)</text>
          </g>
          <g transform="translate(150, 0)">
            <rect x="0" y="0" width="12" height="12" rx="2" fill="#FD9644" />
            <text x="18" y="10" className="fill-neutral-600 dark:text-neutral-400" fontSize="10">低覆盖 (1x)</text>
          </g>
          <g transform="translate(260, 0)">
            <rect x="0" y="0" width="12" height="12" rx="2" fill="#EB3B5A" />
            <text x="18" y="10" className="fill-neutral-600 dark:text-neutral-400" fontSize="10">无覆盖/缺口</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
