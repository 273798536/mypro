import * as React from 'react';
import { BaseChart } from './BaseChart';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { WorkingConditionSegment } from '@/types';

interface ScatterDataPoint {
  x: number;
  y: number;
  value?: number;
  segmentId?: string;
  anomalyId?: string;
}

interface ScatterSeries {
  name: string;
  data: ScatterDataPoint[];
  color?: string;
  symbolSize?: number;
}

interface ScatterChartProps {
  series: ScatterSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  segments?: WorkingConditionSegment[];
  showLegend?: boolean;
  height?: number | string;
  onDataClick?: (params: any) => void;
  trendLine?: boolean;
}

export const ScatterChart: React.FC<ScatterChartProps> = ({
  series,
  xAxisLabel,
  yAxisLabel,
  segments = [],
  showLegend = true,
  height = 300,
  onDataClick,
  trendLine = false,
}) => {
  const option: EChartsOption = React.useMemo(() => {
    const echartsSeries: SeriesOption[] = series.map((s) => {
      const seriesConfig: SeriesOption = {
        name: s.name,
        type: 'scatter',
        symbolSize: s.symbolSize || 8,
        data: s.data.map((d) => [d.x, d.y, d.value]),
        itemStyle: {
          color: s.color,
          opacity: 0.7,
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            shadowBlur: 10,
            shadowColor: s.color,
          },
        },
      };

      if (trendLine && s.data.length > 1) {
        const xSum = s.data.reduce((sum, d) => sum + d.x, 0);
        const ySum = s.data.reduce((sum, d) => sum + d.y, 0);
        const xySum = s.data.reduce((sum, d) => sum + d.x * d.y, 0);
        const x2Sum = s.data.reduce((sum, d) => sum + d.x * d.x, 0);
        const n = s.data.length;
        const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
        const intercept = (ySum - slope * xSum) / n;

        const minX = Math.min(...s.data.map((d) => d.x));
        const maxX = Math.max(...s.data.map((d) => d.x));

        (seriesConfig as any).markLine = {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: s.color,
            type: 'dashed',
            width: 2,
          },
          label: {
            formatter: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(2)}`,
            position: 'end',
            color: s.color,
          },
          data: [
            [
              { coord: [minX, slope * minX + intercept] },
              { coord: [maxX, slope * maxX + intercept] },
            ],
          ],
        };
      }

      return seriesConfig;
    });

    const markAreas = segments.map((segment) => ({
      itemStyle: {
        color: segment.color,
        opacity: 0.05,
      },
      name: segment.name,
      xAxis: [segment.speedRange[0], segment.speedRange[1]],
      yAxis: [segment.torqueRange[0], segment.torqueRange[1]],
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<div class="font-medium">${params.seriesName}</div>
            <div class="font-mono text-xs mt-1">X: ${params.value[0]?.toFixed(2)}</div>
            <div class="font-mono text-xs">Y: ${params.value[1]?.toFixed(2)}</div>
            ${params.value[2] ? `<div class="font-mono text-xs">Value: ${params.value[2]?.toFixed(2)}</div>` : ''}`;
        },
      },
      legend: showLegend ? {
        top: 0,
        data: series.map((s) => s.name),
      } : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: showLegend ? 40 : 10,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 25,
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 40,
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
      },
      series: echartsSeries,
      markArea: markAreas.length > 0 ? markAreas : undefined,
    };
  }, [series, xAxisLabel, yAxisLabel, segments, showLegend, trendLine]);

  return (
    <BaseChart
      option={option}
      style={{ height }}
      onEvents={onDataClick ? { click: onDataClick } : undefined}
    />
  );
};
