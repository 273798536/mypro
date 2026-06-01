import * as React from 'react';
import { BaseChart } from './BaseChart';
import type { EChartsOption } from 'echarts';
import type { WorkingConditionSegment } from '@/types';

interface EfficiencyDataPoint {
  speed: number;
  torque: number;
  efficiency: number;
  segmentId?: string;
}

interface EfficiencyMapChartProps {
  data: EfficiencyDataPoint[];
  segments?: WorkingConditionSegment[];
  minEfficiency?: number;
  maxEfficiency?: number;
  height?: number | string;
  onDataClick?: (params: any) => void;
}

export const EfficiencyMapChart: React.FC<EfficiencyMapChartProps> = ({
  data,
  segments = [],
  minEfficiency = 0,
  maxEfficiency = 100,
  height = 400,
  onDataClick,
}) => {
  const option = React.useMemo((): EChartsOption => {
    const contourData = data.map((d) => [d.speed, d.torque, d.efficiency]);

    const segmentLines = segments.flatMap((segment) => {
      const x1 = segment.speedRange[0];
      const x2 = segment.speedRange[1];
      const y1 = segment.torqueRange[0];
      const y2 = segment.torqueRange[1];
      return [
        {
          coords: [[x1, y1], [x2, y1]],
          name: segment.name,
        },
        {
          coords: [[x2, y1], [x2, y2]],
        },
        {
          coords: [[x2, y2], [x1, y2]],
        },
        {
          coords: [[x1, y2], [x1, y1]],
        },
      ];
    });

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          if (params.componentType === 'series') {
            return `<div class="font-medium">效率 MAP</div>
              <div class="font-mono text-xs mt-1">转速: ${params.value[0]} rpm</div>
              <div class="font-mono text-xs">扭矩: ${params.value[1]} N·m</div>
              <div class="font-mono text-xs font-medium text-green-400">效率: ${params.value[2].toFixed(2)}%</div>`;
          }
          return '';
        },
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '转速 (rpm)',
        nameLocation: 'middle',
        nameGap: 25,
        min: Math.min(...data.map((d) => d.speed)) * 0.9,
        max: Math.max(...data.map((d) => d.speed)) * 1.1,
      },
      yAxis: {
        type: 'value',
        name: '扭矩 (N·m)',
        nameLocation: 'middle',
        nameGap: 40,
        min: Math.min(...data.map((d) => d.torque)) * 0.9,
        max: Math.max(...data.map((d) => d.torque)) * 1.1,
      },
      visualMap: {
        min: minEfficiency,
        max: maxEfficiency,
        calculable: true,
        realtime: true,
        itemHeight: 200,
        itemWidth: 20,
        inRange: {
          color: [
            '#1E3A5F',
            '#2563EB',
            '#3B82F6',
            '#10B981',
            '#84CC16',
            '#F59E0B',
            '#EF4444',
          ],
        },
        text: ['高', '低'],
        textStyle: {
          color: '#94A3B8',
        },
        right: 10,
        top: 'center',
      },
      series: [
        {
          name: '效率 MAP',
          type: 'contour',
          data: contourData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          contour: {
            show: true,
            label: {
              show: true,
              formatter: '{c}%',
              color: '#E2E8F0',
            },
            lineStyle: {
              color: '#334155',
              width: 1,
            },
          },
          itemStyle: {
            borderWidth: 0,
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: '#3B82F6',
              width: 2,
              type: 'dashed',
            },
            data: segmentLines as any,
          },
        },
      ],
    } as unknown as EChartsOption;
  }, [data, segments, minEfficiency, maxEfficiency]);

  return (
    <BaseChart
      option={option}
      style={{ height }}
      onEvents={onDataClick ? { click: onDataClick } : undefined}
    />
  );
};
