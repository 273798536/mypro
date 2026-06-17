import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useAppStore } from '@/store/useAppStore';
import { StandardizedData, Anomaly } from '@/types';
import { getAnomalyTypeLabel } from '@/utils/anomaly';
import { Layers } from 'lucide-react';

interface TimelineChartProps {
  onSelectAnomaly: (anomaly: Anomaly) => void;
}

type SensorType = 'wave_height' | 'wave_speed' | 'temperature';

const SENSOR_CONFIG: { [key in SensorType]: {
  label: string;
  color: string;
  unit: string;
}} = {
  wave_height: { label: '波高', color: '#06B6D4', unit: 'm' },
  wave_speed: { label: '波速', color: '#22C55E', unit: 'm/s' },
  temperature: { label: '水温', color: '#FF7A45', unit: 'C' },
};

export const TimelineChart: React.FC<TimelineChartProps> = ({ onSelectAnomaly }) => {
  const { standardizedData, anomalies, selectedAnomalyId, setSelectedAnomalyId } = useAppStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSensor, setActiveSensor] = useState<SensorType>('wave_height');
  const [hoveredPoint, setHoveredPoint] = useState<{
    data: StandardizedData;
    anomaly?: Anomaly;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getDataBySensor = useCallback(
    (type: SensorType) => {
      return standardizedData.filter((d) => d.sensorType === type).sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    },
    [standardizedData]
  );

  const getAnomaliesBySensor = useCallback(
    (type: SensorType) => {
      return anomalies.filter((a) => a.data.sensorType === type);
    },
    [anomalies]
  );

  useEffect(() => {
    if (!svgRef.current || standardizedData.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 400;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const data = getDataBySensor(activeSensor);
    const sensorAnomalies = getAnomaliesBySensor(activeSensor);

    if (data.length === 0) return;

    const config = SENSOR_CONFIG[activeSensor];

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yValues = data.map((d) => d.value);
    const yMin = Math.min(...yValues) * 0.9;
    const yMax = Math.max(...yValues) * 1.1;

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const anomalyTimeSet = new Set(
      sensorAnomalies.map((a) => a.timestamp.getTime())
    );

    const line = d3
      .line<StandardizedData>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', config.color)
      .attr('stroke-width', 2)
      .attr('d', line)
      .attr('opacity', 0.8);

    const area = d3
      .area<StandardizedData>()
      .x((d) => xScale(d.timestamp))
      .y0(innerHeight)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', `url(#gradient-${activeSensor})`)
      .attr('d', area)
      .attr('opacity', 0.2);

    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', `gradient-${activeSensor}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', config.color).attr('stop-opacity', 0.6);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', config.color).attr('stop-opacity', 0);

    const xAxis = d3.axisBottom(xScale)
      .ticks(6)
      .tickFormat(d3.timeFormat('%H:%M') as any);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('color', '#94A3B8')
      .call(xAxis as any)
      .selectAll('text')
      .attr('font-size', '11px');

    const yAxis = d3.axisLeft(yScale)
      .ticks(6);

    g.append('g')
      .attr('color', '#94A3B8')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '11px');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94A3B8')
      .attr('font-size', '12px')
      .text(`${config.label} (${config.unit})`);

    sensorAnomalies.forEach((anomaly) => {
      if (anomaly.impactScope) {
        const startX = xScale(anomaly.impactScope.startTime);
        const endX = xScale(anomaly.impactScope.endTime);

        g.append('rect')
          .attr('x', startX)
          .attr('y', 0)
          .attr('width', endX - startX)
          .attr('height', innerHeight)
          .attr('fill', anomaly.type === 'direction_reversal' ? '#EAB308' : '#EF4444')
          .attr('opacity', 0.15);
      }
    });

    const circles = g.selectAll('.data-point')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'data-point')
      .attr('transform', (d) => `translate(${xScale(d.timestamp)},${yScale(d.value)})`);

    circles.append('circle')
      .attr('r', (d) => {
        const isAnomaly = anomalyTimeSet.has(d.timestamp.getTime());
        return isAnomaly ? 6 : 3;
      })
      .attr('fill', (d) => {
        const anomaly = sensorAnomalies.find(
          (a) => a.timestamp.getTime() === d.timestamp.getTime()
        );
        if (anomaly) {
          if (anomaly.type === 'threshold') return '#EF4444';
          if (anomaly.type === 'unit_mismatch') return '#A855F7';
          if (anomaly.type === 'direction_reversal') return '#EAB308';
        }
        return config.color;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .on('mouseenter', function(event: any, d: StandardizedData) {
        const anomaly = sensorAnomalies.find(
          (a) => a.timestamp.getTime() === d.timestamp.getTime()
        );
        if (anomaly) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr('r', anomaly ? 10 : 6);

          const [x, y] = d3.pointer(event, svgRef.current);
          setHoveredPoint({ data: d, anomaly });
          setTooltipPos({ x, y });
        }
      })
      .on('mousemove', function(event: any) {
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltipPos({ x, y });
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', function(d: any) {
            const isAnomaly = anomalyTimeSet.has(d.timestamp.getTime());
            return isAnomaly ? 6 : 3;
          });
        setHoveredPoint(null);
      })
      .on('click', function(_: any, d: StandardizedData) {
        const anomaly = sensorAnomalies.find(
          (a) => a.timestamp.getTime() === d.timestamp.getTime()
        );
        if (anomaly) {
          setSelectedAnomalyId(anomaly.id);
          onSelectAnomaly(anomaly);
        }
      });

    sensorAnomalies.forEach((anomaly) => {
        if (anomaly.id === selectedAnomalyId) {
          g.append('circle')
            .attr('cx', xScale(anomaly.timestamp))
            .attr('cy', yScale(anomaly.data.value))
            .attr('r', 14)
            .attr('fill', 'none')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.8)
            .style('animation', 'pulse 1.5s ease-in-out infinite');
        }
      });

    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { r: 10; opacity: 0.8; }
        50% { r: 18; opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [
    standardizedData,
    anomalies,
    selectedAnomalyId,
    activeSensor,
    getDataBySensor,
    getAnomaliesBySensor,
    setSelectedAnomalyId,
    onSelectAnomaly,
  ]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const sensorTypes: SensorType[] = ['wave_height', 'wave_speed', 'temperature'];

  if (standardizedData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-deep-sea-600/30 border border-deep-sea-500 rounded-lg">
        <div className="text-center text-deep-sea-400">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无数据</p>
          <p className="text-xs mt-1">导入传感器日志开始分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-deep-sea-600/30 border border-deep-sea-500 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-deep-sea-500 flex items-center justify-between">
        <h3 className="font-medium text-deep-sea-100">时间线图表</h3>
        <div className="flex gap-2">
          {sensorTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveSensor(type)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeSensor === type
                  ? 'bg-ocean-500 text-white'
                  : 'bg-deep-sea-700 text-deep-sea-300 hover:bg-deep-sea-600'
              }`}
            >
              {SENSOR_CONFIG[type].label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" />

        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-10 bg-deep-sea-700 border border-deep-sea-400 rounded-lg p-3 shadow-lg min-w-[200px]"
            style={{
              left: tooltipPos.x + 70,
              top: tooltipPos.y + 20,
            }}
          >
            <div className="text-xs text-deep-sea-400 mb-1">
              {formatTime(hoveredPoint.data.timestamp)}
            </div>
            <div className="text-sm font-medium text-deep-sea-100 mb-1">
              {hoveredPoint.data.value.toFixed(2)}{' '}
              {hoveredPoint.data.unit}
            </div>
            {hoveredPoint.data.direction && (
              <div className="text-xs text-deep-sea-300 mb-1">
                方向: {hoveredPoint.data.direction}
              </div>
            )}
            {hoveredPoint.anomaly && (
              <div className="mt-2 pt-2 border-t border-deep-sea-500">
                <div className="text-xs font-medium text-alert-orange">
                  {getAnomalyTypeLabel(hoveredPoint.anomaly.type)}
                </div>
                <div className="text-xs text-deep-sea-300 mt-1">
                  {hoveredPoint.anomaly.explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-deep-sea-500 flex items-center gap-4 text-xs text-deep-sea-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-alert-red" />
          <span>阈值超限</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>单位混写</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-alert-yellow" />
          <span>方向反转</span>
        </div>
        <div className="ml-auto text-deep-sea-500">
          共 {standardizedData.length} 条记录
        </div>
      </div>
    </div>
  );
};
