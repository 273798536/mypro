import React from 'react';
import ReactECharts from 'echarts-for-react';
import { DataSource } from '../types';

interface BatchStatusChartProps {
  dataSource: DataSource;
}

export const BatchStatusChart: React.FC<BatchStatusChartProps> = ({ dataSource }) => {
  const xAxis = dataSource.batches.map(b => b.batchId);
  const blankData = dataSource.batches.map(b => b.blankCount);
  const standardData = dataSource.batches.map(b => b.standardCount);
  const unknownData = dataSource.batches.map(b => b.unknownCount);
  const issuesData = dataSource.batches.map(b => b.issues.filter(i => !i.resolved).length);

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['空白对照', '标准品', '未知样品', '未解决问题数'], top: 0 },
    grid: { left: 40, right: 40, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: xAxis, axisLabel: { rotate: 20 } },
    yAxis: [
      { type: 'value', name: '样品数' },
      { type: 'value', name: '问题数', position: 'right' },
    ],
    series: [
      { name: '空白对照', type: 'bar', stack: 'samples', data: blankData, itemStyle: { color: '#22c55e' } },
      { name: '标准品', type: 'bar', stack: 'samples', data: standardData, itemStyle: { color: '#3b82f6' } },
      { name: '未知样品', type: 'bar', stack: 'samples', data: unknownData, itemStyle: { color: '#64748b' } },
      {
        name: '未解决问题数',
        type: 'line',
        yAxisIndex: 1,
        data: issuesData,
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 10,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
};
