import * as React from 'react';
import { BaseChart } from './BaseChart';
import type { EChartsOption, SeriesOption } from 'echarts';

interface BarChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface BarChartSeries {
  name: string;
  data: BarChartDataPoint[];
  color?: string;
  stack?: string;
}

interface BarChartProps {
  series: BarChartSeries[];
  xAxisData: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  horizontal?: boolean;
  showLegend?: boolean;
  showValue?: boolean;
  height?: number | string;
  onDataClick?: (params: any) => void;
}

export const BarChart: React.FC<BarChartProps> = ({
  series,
  xAxisData,
  xAxisLabel,
  yAxisLabel,
  horizontal = false,
  showLegend = true,
  showValue = false,
  height = 300,
  onDataClick,
}) => {
  const option: EChartsOption = React.useMemo(() => {
    const echartsSeries: SeriesOption[] = series.map((s) => ({
      name: s.name,
      type: 'bar',
      stack: s.stack,
      data: s.data.map((d) => ({
        value: d.value,
        itemStyle: {
          color: d.color || s.color,
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
        },
      })),
      label: showValue ? {
        show: true,
        position: horizontal ? 'right' : 'top',
        formatter: '{c}',
        color: '#94A3B8',
        fontSize: 11,
      } : undefined,
      barWidth: '60%',
    }));

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
            html += `<div class="flex items-center gap-2 mt-1">
              <span style="background:${p.color};width:8px;height:8px;border-radius:50%;display:inline-block;"></span>
              <span>${p.seriesName}:</span>
              <span class="font-mono font-medium">${p.value}</span>
            </div>`;
          });
          return html;
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
      xAxis: horizontal ? {
        type: 'value',
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 30,
      } : {
        type: 'category',
        data: xAxisData,
        name: xAxisLabel,
        nameLocation: 'middle',
        nameGap: 25,
        axisLabel: {
          rotate: xAxisData.length > 5 ? 30 : 0,
        },
      },
      yAxis: horizontal ? {
        type: 'category',
        data: xAxisData,
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 40,
      } : {
        type: 'value',
        name: yAxisLabel,
        nameLocation: 'middle',
        nameGap: 40,
      },
      series: echartsSeries,
    };
  }, [series, xAxisData, xAxisLabel, yAxisLabel, horizontal, showLegend, showValue]);

  return (
    <BaseChart
      option={option}
      style={{ height }}
      onEvents={onDataClick ? { click: onDataClick } : undefined}
    />
  );
};
