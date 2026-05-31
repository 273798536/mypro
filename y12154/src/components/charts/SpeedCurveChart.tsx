import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { SpeedPoint } from '../../types';
import { formatTime } from '../../utils/helpers';

interface SpeedCurveChartProps {
  actualCurve: SpeedPoint[];
  theoreticalCurve?: SpeedPoint[];
  speedGapThreshold?: number;
  brakeStartTime?: number;
  title?: string;
  height?: number;
}

export const SpeedCurveChart: React.FC<SpeedCurveChartProps> = ({
  actualCurve,
  theoreticalCurve,
  speedGapThreshold = 0.15,
  brakeStartTime = 0,
  title = '速度曲线图',
  height = 400,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const actualData = actualCurve.map(p => [p.time, p.speed]);
    const theoreticalData = theoreticalCurve?.map(p => [p.time, p.speed]) || [];

    const maxTime = Math.max(
      ...actualCurve.map(p => p.time),
      ...(theoreticalCurve?.map(p => p.time) || [0])
    );

    const maxSpeed = Math.max(
      ...actualCurve.map(p => p.speed),
      ...(theoreticalCurve?.map(p => p.speed) || [0])
    );

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 600,
          color: '#1E293B',
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const time = params[0]?.axisValue;
          let html = `<div class="text-xs"><strong>时间: ${formatTime(time)}</strong></div>`;
          params.forEach((param: any) => {
            if (param.value && param.value[1] !== undefined) {
              html += `<div class="text-xs" style="color: ${param.color}">
                ${param.marker} ${param.seriesName}: ${param.value[1].toFixed(2)} m/s
              </div>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: ['实际速度', '理论速度', '速度缺口阈值', '制动指令时刻'],
        bottom: 10,
        itemGap: 20,
        textStyle: {
          fontSize: 11,
          color: '#64748B',
        },
      },
      grid: {
        left: 60,
        right: 30,
        top: 60,
        bottom: 60,
      },
      xAxis: {
        type: 'value',
        name: '时间 (s)',
        nameTextStyle: {
          fontSize: 11,
          color: '#64748B',
        },
        axisLabel: {
          fontSize: 10,
          color: '#64748B',
        },
        min: 0,
        max: maxTime,
      },
      yAxis: {
        type: 'value',
        name: '速度 (m/s)',
        nameTextStyle: {
          fontSize: 11,
          color: '#64748B',
        },
        axisLabel: {
          fontSize: 10,
          color: '#64748B',
        },
        min: 0,
        max: maxSpeed * 1.1,
      },
      series: [
        {
          name: '实际速度',
          type: 'line' as const,
          data: actualData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#1E40AF',
          },
          itemStyle: {
            color: '#1E40AF',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(30, 64, 175, 0.3)' },
              { offset: 1, color: 'rgba(30, 64, 175, 0.05)' },
            ]),
          },
        },
        ...(theoreticalData.length > 0 ? [{
          name: '理论速度',
          type: 'line' as const,
          data: theoreticalData,
          smooth: true,
          symbol: 'diamond',
          symbolSize: 6,
          lineStyle: {
            width: 2,
            type: 'dashed' as const,
            color: '#059669',
          },
          itemStyle: {
            color: '#059669',
          },
        }] : []),
        {
          name: '速度缺口阈值',
          type: 'line' as const,
          data: [
            [brakeStartTime, speedGapThreshold],
            [maxTime, speedGapThreshold],
          ],
          symbol: 'none',
          lineStyle: {
            width: 1,
            type: 'dotted' as const,
            color: '#DC2626',
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              width: 1,
              type: 'dotted',
              color: '#DC2626',
            },
          },
        },
        {
          name: '制动指令时刻',
          type: 'line' as const,
          data: [
            [brakeStartTime, 0],
            [brakeStartTime, maxSpeed],
          ],
          symbol: 'none',
          lineStyle: {
            width: 2,
            type: 'solid' as const,
            color: '#F59E0B',
          },
          markLine: {
            silent: true,
            symbol: 'none',
            label: {
              show: true,
              position: 'end',
              formatter: '制动开始',
              fontSize: 10,
              color: '#F59E0B',
            },
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [actualCurve, theoreticalCurve, speedGapThreshold, brakeStartTime, title]);

  return (
    <div ref={chartRef} style={{ width: '100%', height }} />
  );
};
