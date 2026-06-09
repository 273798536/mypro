import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Issue } from '../types';

interface IssueTypePieProps {
  issues: Issue[];
}

export const IssueTypePie: React.FC<IssueTypePieProps> = ({ issues }) => {
  const typeLabelMap: Record<string, string> = {
    blank_control_missing: '空白对照缺失',
    temperature_missing: '温度曲线不完整',
    temperature_unstable: '温度波动过大',
    experiment_failed: '实验失败',
    reagent_expired: '试剂过期',
    reagent_invalid: '试剂无效',
    reagent_review: '试剂待审核',
  };
  const counts = new Map<string, number>();
  for (const i of issues) {
    if (i.resolved) continue;
    counts.set(i.type, (counts.get(i.type) || 0) + 1);
  }
  const data = Array.from(counts.entries()).map(([type, value]) => ({
    name: typeLabelMap[type] || type,
    value,
  }));

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 10, top: 20 },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['60%', '55%'],
        avoidLabelOverlap: true,
        label: { show: true, formatter: '{b}\n{c}条' },
        data,
        color: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} notMerge />;
};
