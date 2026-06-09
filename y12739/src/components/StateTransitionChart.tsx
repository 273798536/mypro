import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, Tag } from 'antd';
import { useApp } from '../context/AppContext';
import type { DPTransition } from '../types';

const trColor = (t: DPTransition['transitionType']) => {
  if (t === 'improve') return '#52c41a';
  if (t === 'decline') return '#ff4d4f';
  return '#bfbfbf';
};

const StateTransitionChart: React.FC = () => {
  const { state } = useApp();
  const { transitionTable, latestExtrapolation } = state;

  if (!transitionTable) {
    return <Card><div style={{ color: '#999' }}>暂无数据，请先加载样例或计算转移表</div></Card>;
  }

  const stateNodes = [
    { value: 0, name: '未掌握' },
    { value: 0.25, name: '初步了解' },
    { value: 0.5, name: '基本掌握' },
    { value: 0.75, name: '熟练掌握' },
    { value: 1, name: '完全掌握' },
  ];

  const allTransitions: DPTransition[] = [
    ...transitionTable.transitions,
    ...(latestExtrapolation?.projectedTransitions ?? []),
  ];

  const seriesData = transitionTable.states.map((s, idx) => ({
    name: s.knowledgePointName,
    value: [idx, stateNodes.findIndex((n) => n.value === s.value), s.value],
    itemStyle: {
      color:
        s.value >= 0.75
          ? '#52c41a'
          : s.value >= 0.5
          ? '#1677ff'
          : s.value >= 0.25
          ? '#faad14'
          : '#ff4d4f',
    },
  }));

  const links: any[] = [];
  allTransitions.forEach((tr) => {
    const kpIdx = transitionTable.states.findIndex(
      (s) => s.knowledgePointId === tr.knowledgePointId
    );
    if (kpIdx < 0) return;
    const fromIdx = stateNodes.findIndex((n) => n.value === tr.fromState);
    const toIdx = stateNodes.findIndex((n) => n.value === tr.toState);
    links.push({
      coords: [[kpIdx, fromIdx], [kpIdx, toIdx]],
      lineStyle: {
        color: trColor(tr.transitionType),
        width: 2 + tr.probability * 2,
        curveness: 0.2,
        type: tr.description.includes('[') ? 'dashed' : 'solid',
      },
      label: {
        show: true,
        formatter: `${tr.transitionType === 'improve' ? '↑' : tr.transitionType === 'decline' ? '↓' : '→'} ${(tr.probability * 100).toFixed(0)}%`,
        fontSize: 10,
      },
    });
  });

  const option = {
    title: {
      text: '状态转移可视化图',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      formatter: (p: any) => {
        if (p.dataType === 'edge') return p.data.label?.formatter ?? '';
        const kp = transitionTable.states[p.data.value[0]];
        return `${kp.knowledgePointName}<br/>掌握度: ${kp.value} (${kp.label})`;
      },
    },
    grid: { left: 100, right: 60, top: 60, bottom: 60 },
    xAxis: {
      type: 'category',
      data: transitionTable.states.map((s) => s.knowledgePointName),
      axisLabel: { rotate: 20, fontSize: 11 },
      name: '知识点',
      nameLocation: 'middle',
      nameGap: 40,
    },
    yAxis: {
      type: 'category',
      data: stateNodes.map((n) => `${n.value} ${n.name}`),
      inverse: true,
      name: '掌握度状态',
      nameLocation: 'middle',
      nameGap: 70,
    },
    series: [
      {
        type: 'graph',
        coordinateSystem: 'cartesian2d',
        data: seriesData,
        links,
        symbolSize: 16,
        lineStyle: { opacity: 0.8 },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 6,
      },
    ],
  };

  return (
    <Card size="small">
      <ReactECharts option={option} style={{ height: 380 }} notMerge />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <Tag color="green">提升</Tag>
        <Tag color="red">下降</Tag>
        <Tag>虚线为外推预测</Tag>
        {latestExtrapolation && !latestExtrapolation.success && (
          <Tag color="red">
            外推被拦截：步数{latestExtrapolation.actualSteps} &gt; 上限{latestExtrapolation.maxAllowedSteps}
          </Tag>
        )}
      </div>
    </Card>
  );
};

export default StateTransitionChart;
