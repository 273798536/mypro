import * as React from 'react';
import { BaseChart } from './BaseChart';
import type { EChartsOption, SeriesOption } from 'echarts';
import type { ComparisonData } from '@/types';

interface ComparisonChartProps {
  data: ComparisonData;
  height?: number | string;
  showDifference?: boolean;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  height = 300,
  showDifference = true,
}) => {
  const option: EChartsOption = React.useMemo(() => {
    const categories = ['转速 (rpm)', '扭矩 (N·m)', '效率 (%)', '输出功率 (kW)'];
    const originalData = [
      data.original.originalData?.speed || 0,
      data.original.originalData?.torque || 0,
      data.original.efficiency,
      data.original.outputPower / 1000,
    ];
    const correctedData = [
      data.corrected.correctedData?.speed || 0,
      data.corrected.correctedData?.torque || 0,
      data.corrected.efficiency,
      data.corrected.outputPower / 1000,
    ];

    const series: SeriesOption[] = [
      {
        name: '原始数据',
        type: 'bar',
        data: originalData,
        itemStyle: {
          color: '#3B82F6',
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '35%',
      },
      {
        name: '修正数据',
        type: 'bar',
        data: correctedData,
        itemStyle: {
          color: '#10B981',
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '35%',
      },
    ];

    if (showDifference) {
      const diffData = [
        data.diff.speed,
        data.diff.torque,
        data.diff.efficiency,
        data.diff.power / 1000,
      ];
      series.push({
        name: '差值',
        type: 'line',
        data: diffData,
        yAxisIndex: 1,
        itemStyle: {
          color: '#F59E0B',
        },
        lineStyle: {
          width: 2,
        },
        symbol: 'circle',
        symbolSize: 8,
      });
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          let html = `<div class="font-medium">${params[0].name}</div>`;
          params.forEach((p: any) => {
            const sign = p.seriesName === '差值' && p.value > 0 ? '+' : '';
            html += `<div class="flex items-center gap-2 mt-1">
              <span style="background:${p.color};width:8px;height:8px;border-radius:50%;display:inline-block;"></span>
              <span>${p.seriesName}:</span>
              <span class="font-mono font-medium ${p.seriesName === '差值' && p.value > 0 ? 'text-green-400' : p.seriesName === '差值' && p.value < 0 ? 'text-red-400' : ''}">${sign}${p.value?.toFixed(2)}</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        top: 0,
        data: showDifference ? ['原始数据', '修正数据', '差值'] : ['原始数据', '修正数据'],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 40,
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: '#94A3B8',
        },
      },
      yAxis: showDifference
        ? [
            {
              type: 'value',
              name: '数值',
              nameLocation: 'middle',
              nameGap: 40,
            },
            {
              type: 'value',
              name: '差值',
              nameLocation: 'middle',
              nameGap: 40,
              axisLabel: {
                formatter: '{value}',
              },
            },
          ]
        : {
            type: 'value',
            name: '数值',
            nameLocation: 'middle',
            nameGap: 40,
          },
      series,
    };
  }, [data, showDifference]);

  return <BaseChart option={option} style={{ height }} />;
};
