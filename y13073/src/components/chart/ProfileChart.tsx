import { useMemo, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { CadRecord, AnomalyPoint } from '../../types';
import { usePanZoom } from '../../hooks/usePanZoom';
import { CHART_CONFIG, COLORS, ANOMALY_TYPE_OPTIONS } from '../../utils/constants';
import { useDataStore } from '../../store/dataStore';
import { useViewStore } from '../../store/viewStore';
import { AlertTriangle } from 'lucide-react';

interface ProfileChartProps {
  records: CadRecord[];
  anomalies: AnomalyPoint[];
}

export const ProfileChart = ({ records, anomalies }: ProfileChartProps) => {
  const setSelectedRecord = useDataStore((s) => s.setSelectedRecord);
  const setSelectedAnomaly = useDataStore((s) => s.setSelectedAnomaly);
  const selectedRecordId = useDataStore((s) => s.selectedRecordId);
  const selectedAnomalyId = useDataStore((s) => s.selectedAnomalyId);
  const chartState = useViewStore((s) => s.chartState);
  const setChartState = useViewStore((s) => s.setChartState);
  const activeViewId = useViewStore((s) => s.activeViewId);

  const svgRef = useRef<SVGSVGElement>(null);
  const initialized = useRef(false);

  const {
    state: panZoomState,
    containerRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    reset,
    zoomIn,
    zoomOut,
    setState: setPanZoomState,
  } = usePanZoom({
    onStateChange: (state) => {
      if (!activeViewId) {
        setChartState(state);
      }
    },
  });

  useEffect(() => {
    if (activeViewId) {
      setPanZoomState(chartState);
    }
  }, [activeViewId, chartState, setPanZoomState]);

  const { width, height, margin } = CHART_CONFIG;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const scales = useMemo(() => {
    const validRecords = records.filter((r) => !isNaN(r.y));
    
    const xExtent = d3.extent(validRecords, (r) => r.x) as [number, number];
    const yExtent = d3.extent(validRecords, (r) => r.y) as [number, number];
    
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05 || 50;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 100;

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    return { xScale, yScale };
  }, [records, innerWidth, innerHeight]);

  const anomalyMap = useMemo(() => {
    const map = new Map<string, AnomalyPoint[]>();
    anomalies.forEach((a) => {
      if (!map.has(a.recordId)) {
        map.set(a.recordId, []);
      }
      map.get(a.recordId)!.push(a);
    });
    return map;
  }, [anomalies]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => a.x - b.x);
  }, [records]);

  const lineGenerator = useMemo(() => {
    return d3
      .line<CadRecord>()
      .x((d) => scales.xScale(d.x))
      .y((d) => scales.yScale(d.y))
      .defined((d) => !isNaN(d.y))
      .curve(d3.curveMonotoneX);
  }, [scales]);

  const areaGenerator = useMemo(() => {
    return d3
      .area<CadRecord>()
      .x((d) => scales.xScale(d.x))
      .y0(innerHeight)
      .y1((d) => scales.yScale(d.y))
      .defined((d) => !isNaN(d.y))
      .curve(d3.curveMonotoneX);
  }, [scales, innerHeight]);

  const areaPath = useMemo(() => {
    return areaGenerator(sortedRecords);
  }, [areaGenerator, sortedRecords]);

  const linePath = useMemo(() => {
    return lineGenerator(sortedRecords);
  }, [lineGenerator, sortedRecords]);

  const handlePointClick = useCallback(
    (record: CadRecord, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedRecord(record.id);
      const recordAnomalies = anomalyMap.get(record.id);
      if (recordAnomalies && recordAnomalies.length > 0) {
        setSelectedAnomaly(recordAnomalies[0].id);
      } else {
        setSelectedAnomaly(null);
      }
    },
    [setSelectedRecord, setSelectedAnomaly, anomalyMap]
  );

  const handleAnomalyClick = useCallback(
    (anomaly: AnomalyPoint, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelectedAnomaly(anomaly.id);
    },
    [setSelectedAnomaly]
  );

  const handleSvgClick = useCallback(() => {
    setSelectedRecord(null);
    setSelectedAnomaly(null);
  }, [setSelectedRecord, setSelectedAnomaly]);

  const transform = `translate(${margin.left + panZoomState.center.x * panZoomState.zoom}, ${margin.top + panZoomState.center.y * panZoomState.zoom}) scale(${panZoomState.zoom})`;

  const gridLines = useMemo(() => {
    const xTicks = scales.xScale.ticks(10);
    const yTicks = scales.yScale.ticks(8);
    
    return {
      x: xTicks.map((tick) => ({
        x1: scales.xScale(tick),
        x2: scales.xScale(tick),
        y1: 0,
        y2: innerHeight,
        label: tick,
      })),
      y: yTicks.map((tick) => ({
        x1: 0,
        x2: innerWidth,
        y1: scales.yScale(tick),
        y2: scales.yScale(tick),
        label: tick,
      })),
    };
  }, [scales, innerWidth, innerHeight]);

  const getAnomalyColor = (type: string) => {
    const option = ANOMALY_TYPE_OPTIONS.find((o) => o.value === type);
    return option ? option.color.replace('text-', '') : 'orange';
  };

  const colorMap: Record<string, string> = {
    'boundary': '#F97316',
    'mutation': '#EF4444',
    'incomplete': '#EAB308',
    'gap': '#A855F7',
  };

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-center text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无数据</p>
          <p className="text-xs mt-1">请先加载演示数据或上传CSV文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
          title="放大"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors"
          title="缩小"
        >
          −
        </button>
        <button
          onClick={reset}
          className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors text-xs"
          title="重置视图"
        >
          ↺
        </button>
      </div>

      <svg
        ref={(el) => {
          svgRef.current = el;
          (containerRef as React.MutableRefObject<SVGSVGElement | null>).current = el;
        }}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="cursor-grab select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleSvgClick}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.secondary} stopOpacity="0.3" />
            <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.05" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={transform}>
          <g className="grid-lines" opacity="0.3">
            {gridLines.x.map((line, i) => (
              <line
                key={`x-${i}`}
                x1={line.x1}
                x2={line.x2}
                y1={line.y1}
                y2={line.y2}
                stroke={COLORS.grid}
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
            {gridLines.y.map((line, i) => (
              <line
                key={`y-${i}`}
                x1={line.x1}
                x2={line.x2}
                y1={line.y1}
                y2={line.y2}
                stroke={COLORS.grid}
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            ))}
          </g>

          {areaPath && (
            <path
              d={areaPath}
              fill="url(#areaGradient)"
              className="transition-opacity duration-300"
            />
          )}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={COLORS.secondary}
              strokeWidth="2"
              className="transition-opacity duration-300"
            />
          )}

          {sortedRecords.map((record) => {
            const isSelected = selectedRecordId === record.id;
            const hasAnomaly = anomalyMap.has(record.id);
            const recordAnomalies = anomalyMap.get(record.id) || [];
            const cx = scales.xScale(record.x);
            const cy = isNaN(record.y) ? innerHeight / 2 : scales.yScale(record.y);

            return (
              <g key={record.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 8 : hasAnomaly ? 6 : 4}
                  fill={hasAnomaly ? colorMap[recordAnomalies[0]?.type] || COLORS.danger : COLORS.accent}
                  stroke={isSelected ? '#fff' : 'transparent'}
                  strokeWidth={isSelected ? 2 : 0}
                  className="cursor-pointer transition-all duration-200 hover:r-6"
                  style={{
                    filter: hasAnomaly ? 'url(#glow)' : 'none',
                    opacity: isNaN(record.y) ? 0.4 : 1,
                  }}
                  onClick={(e) => handlePointClick(record, e)}
                />
                
                {hasAnomaly && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill="none"
                    stroke={colorMap[recordAnomalies[0]?.type] || COLORS.danger}
                    strokeWidth="1.5"
                    className="pointer-events-none"
                    style={{
                      animation: 'pulse 2s infinite',
                    }}
                  />
                )}
              </g>
            );
          })}

          {anomalies.map((anomaly) => {
            const record = records.find((r) => r.id === anomaly.recordId);
            if (!record) return null;
            const cx = scales.xScale(record.x);
            const cy = isNaN(record.y) ? innerHeight / 2 : scales.yScale(record.y);
            const isSelected = selectedAnomalyId === anomaly.id;

            return (
              <g key={anomaly.id}>
                <circle
                  cx={cx}
                  cy={cy - 20}
                  r={8}
                  fill={colorMap[anomaly.type]}
                  stroke={isSelected ? '#fff' : 'transparent'}
                  strokeWidth={isSelected ? 2 : 0}
                  className="cursor-pointer"
                  onClick={(e) => handleAnomalyClick(anomaly, e)}
                >
                  <title>{anomaly.description}</title>
                </circle>
                <text
                  x={cx}
                  y={cy - 17}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  !
                </text>
              </g>
            );
          })}

          <g className="x-axis" transform={`translate(0, ${innerHeight})`}>
            {gridLines.x.map((line, i) => (
              <text
                key={`x-label-${i}`}
                x={line.x1}
                y={20}
                textAnchor="middle"
                fill={COLORS.textSecondary}
                fontSize="10"
              >
                {line.label}
              </text>
            ))}
            <text
              x={innerWidth / 2}
              y={45}
              textAnchor="middle"
              fill={COLORS.textSecondary}
              fontSize="12"
              fontWeight="500"
            >
              X坐标 (m)
            </text>
          </g>

          <g className="y-axis">
            {gridLines.y.map((line, i) => (
              <text
                key={`y-label-${i}`}
                x={-10}
                y={line.y1 + 3}
                textAnchor="end"
                fill={COLORS.textSecondary}
                fontSize="10"
              >
                {line.label}
              </text>
            ))}
            <text
              x={-50}
              y={innerHeight / 2}
              textAnchor="middle"
              fill={COLORS.textSecondary}
              fontSize="12"
              fontWeight="500"
              transform={`rotate(-90, -50, ${innerHeight / 2})`}
            >
              高程 (m)
            </text>
          </g>
        </g>
      </svg>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform-origin: center;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
