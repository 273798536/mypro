import React, { useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, TooltipComponentFormatterCallbackParams } from 'echarts';
import Chart from './Chart';
import { SimulationResult } from '../../types';

interface WaitDistributionChartProps {
  waitTimes?: number[];
  simulationResult?: SimulationResult;
  height?: number;
  showCumulative?: boolean;
}

const WaitDistributionChart: React.FC<WaitDistributionChartProps> = ({
  waitTimes = [],
  simulationResult,
  height = 350,
  showCumulative = true,
}) => {
  const distributionData = useMemo(() => {
    if (simulationResult?.waitDistribution?.length) {
      return simulationResult.waitDistribution;
    }

    if (waitTimes.length === 0) return [];

    const bins = 10;
    const max = Math.max(...waitTimes, 1);
    const binWidth = max / bins;
    const histogram = Array(bins).fill(0);

    waitTimes.forEach((value) => {
      const binIndex = Math.min(Math.floor(value / binWidth), bins - 1);
      histogram[binIndex]++;
    });

    return histogram;
  }, [waitTimes, simulationResult]);

  const xAxisData = useMemo(() => {
    if (simulationResult?.waitDistribution?.length) {
      const maxWait = simulationResult.maxWaitTime;
      const binWidth = maxWait / simulationResult.waitDistribution.length;
      return simulationResult.waitDistribution.map((_, i) =>
        `${Math.round(i * binWidth)}-${Math.round((i + 1) * binWidth)}`
      );
    }

    if (waitTimes.length === 0) return [];
    const max = Math.max(...waitTimes, 1);
    const bins = 10;
    const binWidth = max / bins;
    return Array(bins)
      .fill(0)
      .map((_, i) => `${Math.round(i * binWidth)}-${Math.round((i + 1) * binWidth)}`);
  }, [waitTimes, simulationResult]);

  const cumulativeData = useMemo(() => {
    const total = distributionData.reduce((a, b) => a + b, 0) || 1;
    let cumulative = 0;
    return distributionData.map((value) => {
      cumulative += value;
      return Math.round((cumulative / total) * 1000) / 10;
    });
  }, [distributionData]);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const paramArr = Array.isArray(params) ? params : [params];
          const data = paramArr[0] as { name: string; value: number };
          const cumulative = showCumulative && paramArr[1] as { value: number } | undefined;
          let result = `<div style="font-weight: 600; margin-bottom: 4px;">等待时长 ${data.name} 分钟</div>`;
          result += `<div>人数：<span style="font-weight: 600; color: #165DFF;">${data.value}</span> 人</div>`;
          if (cumulative) {
            result += `<div>累积占比：<span style="font-weight: 600; color: #00B42A;">${cumulative.value}%</span></div>`;
          }
          return result;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          fontSize: 11,
          color: '#4E5969',
        },
        axisLine: {
          lineStyle: {
            color: '#E5E6EB',
          },
        },
        name: '等待时长（分钟）',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: {
          color: '#4E5969',
          fontSize: 12,
        },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: '人数',
          nameTextStyle: {
            color: '#4E5969',
            fontSize: 12,
          },
          axisLabel: {
            fontSize: 11,
            color: '#4E5969',
          },
          splitLine: {
            lineStyle: {
              color: '#F2F3F5',
              type: 'dashed',
            },
          },
        },
        ...(showCumulative
          ? [
              {
                type: 'value' as const,
                name: '累积占比',
                nameTextStyle: {
                  color: '#4E5969',
                  fontSize: 12,
                },
                axisLabel: {
                  fontSize: 11,
                  color: '#4E5969',
                  formatter: '{value}%',
                },
                splitLine: {
                  show: false,
                },
                max: 100,
              },
            ]
          : []),
      ],
      series: [
        {
          name: '等待人数',
          type: 'bar' as const,
          data: distributionData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#6AA1FF' },
              { offset: 1, color: '#165DFF' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
          barWidth: '60%',
          animationDuration: 600,
          animationEasing: 'cubicOut',
        },
        ...(showCumulative
          ? [
              {
                name: '累积占比',
                type: 'line' as const,
                yAxisIndex: 1,
                data: cumulativeData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                  color: '#00B42A',
                  width: 2,
                },
                itemStyle: {
                  color: '#00B42A',
                  borderWidth: 2,
                  borderColor: '#fff',
                },
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(0, 180, 42, 0.2)' },
                    { offset: 1, color: 'rgba(0, 180, 42, 0)' },
                  ]),
                },
              },
            ]
          : []),
      ],
    }),
    [xAxisData, distributionData, cumulativeData, showCumulative]
  );

  return <Chart option={option} height={height} />;
};

export default WaitDistributionChart;
