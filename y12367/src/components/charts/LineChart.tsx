import * as React from 'react';
import { BaseChart } from './BaseChart';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { WorkingConditionSegment, AnomalyRecord } from '@/types';

interface LineChartDataPoint {
  timestamp: number;
  value: number;
  segmentId?: string;
  anomalyId?: string;
}

interface LineChartSeries {
  name: string;
  data: LineChartDataPoint[];
  color?: string;
  type?: 'line' | 'smooth';
  showMarkers?: boolean;
}

interface LineChartProps {
  series: LineChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  segments?: WorkingConditionSegment[];
  anomalies?: AnomalyRecord[];
  showLegend?: boolean;
  showGrid?: boolean;
  height?: number | string;
  onDataClick?: (params: any) => void;
  threshold?: { value: number; label: string; color?: string };
}

export const LineChart: React.FC<LineChartProps> = ({
  series,
  xAxisLabel,
  yAxisLabel,
  segments = [],
  anomalies = [],
  showLegend = true,
  showGrid = true,
  height = 300,
  onDataClick,
  threshold,
}) => {
  const option: EChartsOption = React.useMemo(() => {
    const echartsSeries: SeriesOption[] = series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: s.type === 'smooth',
      symbol: s.showMarkers ? 'circle' : 'none',
      symbolSize: 6,
      data: s.data.map((d) => [d.timestamp, d.value]),
      lineStyle: {
        width: 2,
        color: s.color,
      },
      itemStyle: {
        color: s.color,
      },
      areaStyle: s.type === 'smooth' ? {
        opacity: 0.1,
        color: s.color,
      } : undefined,
    }));

    const markAreas = segments.map((segment) => {
      const minData = Math.min(...series.flatMap(s => s.data.map(d => d.value)));
      const maxData = Math.max(...series.flatMap(s => s.data.map(d => d.value)));
      return {
        itemStyle: {
          color: segment.color,
          opacity: 0.05,
        },
        name: segment.name,
        xAxis: [
          segment.speedRange[0],
          segment.speedRange[1],
        ],
        yAxis: [minData, maxData],
      };
    });

    if (threshold) {
      echartsSeries.push({
        name: threshold.label,
        type: 'line',
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: threshold.color || '#EF4444',
            type: 'dashed',
            width: 2,
          },
          label: {
            formatter: threshold.label,
            position: 'end',
            color: threshold.color || '#EF4444',
          },
          data: [
            {
              yAxis: threshold.value,
            },
          ],
        },
        data: [],
      } as SeriesOption);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const timestamp = params[0].value[0];
          const date = new Date(timestamp);
          let html = `<div class="font-mono text-xs">${date.toLocaleString('zh-CN')}</div>`;
          params.forEach((p: any) => {
            if (p.seriesName !== threshold?.label) {
              html += `<div class="flex items-center gap-2 mt-1">
                <span style="background:${p.color};width:8px;height:8px;border-radius:50%;display:inline-block;"></span>
                <span>${p.seriesName}:</span>
                <span class="font-mono font-medium">${p.value[1]?.toFixed(2)}</span>
              </div>`;
            }
          });
          return html;
        },
      },
      legend: showLegend ? {
        top: 0,
        data: series.map((s) => s.name),
      } : undefined,
      grid: {
        show: showGrid,
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: showLegend ? 40 : 10,
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 25,
        axisLabel: {
          formatter: (value: number) => {
            const date = new Date(value);
            return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
          },
        },
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 40,
      },
      series: echartsSeries,
      markArea: markAreas.length > 0 ? markAreas : undefined,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
      ],
    };
  }, [series, xAxisLabel, yAxisLabel, segments, showLegend, showGrid, threshold]);

  return (
    <BaseChart
      option={option}
      style={{ height }}
      onEvents={onDataClick ? { click: onDataClick } : undefined}
    />
  );
};
