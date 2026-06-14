import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TensionRecord, ProcessingStatus, JumpCause } from '../types';

interface TensionChartProps {
  records: TensionRecord[];
}

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  [ProcessingStatus.NORMAL]: '#52c41a',
  [ProcessingStatus.NOISE]: '#faad14',
  [ProcessingStatus.EXTREME]: '#ff4d4f',
  [ProcessingStatus.SUSPICIOUS]: '#fa8c16',
  [ProcessingStatus.MANUAL_OVERRIDE]: '#722ed1',
  [ProcessingStatus.PENDING]: '#bfbfbf',
};

export const TensionChart: React.FC<TensionChartProps> = ({ records }) => {
  const option = useMemo(() => {
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
    
    const xData = sorted.map(r => {
      const date = new Date(r.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
    
    const normalData = sorted.map(r => 
      r.processingStatus === ProcessingStatus.NORMAL ? r.tension : null
    );
    
    const abnormalData = sorted.map(r => 
      r.processingStatus !== ProcessingStatus.NORMAL ? r.tension : null
    );
    
    const jumpPoints = sorted
      .filter(r => r.isJumpPoint)
      .map(r => ({
        value: [
          xData[sorted.indexOf(r)],
          r.tension,
        ],
        itemStyle: {
          color: '#eb2f96',
          borderColor: '#fff',
          borderWidth: 2,
        },
        symbolSize: 12,
      }));

    return {
      title: {
        text: '张力参数回放曲线',
        left: 'center',
        textStyle: { fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; dataIndex: number; data: { value: [string, number] } }[];
          if (!p || p.length === 0) return '';
          const idx = p[0].dataIndex;
          const record = sorted[idx];
          if (!record) return '';
          
          const statusMap: Record<ProcessingStatus, string> = {
            [ProcessingStatus.NORMAL]: '正常',
            [ProcessingStatus.NOISE]: '疑似噪声',
            [ProcessingStatus.EXTREME]: '极端值',
            [ProcessingStatus.SUSPICIOUS]: '待确认',
            [ProcessingStatus.MANUAL_OVERRIDE]: '人工修改',
            [ProcessingStatus.PENDING]: '待分析',
          };
          
          const causeMap: Record<JumpCause, string> = {
            [JumpCause.THRESHOLD]: '阈值波动',
            [JumpCause.UNIT_MISMATCH]: '单位不一致',
            [JumpCause.MATERIAL_NAME_MISMATCH]: '材料名称不一致',
            [JumpCause.UNKNOWN]: '未知原因',
          };
          
          let html = `<div style="font-weight:bold;">${p[0].axisValue}</div>`;
          html += `<div>张力: ${record.tension.toFixed(2)} ${record.tensionUnit}</div>`;
          html += `<div>材料: ${record.materialName} (${record.materialId})</div>`;
          html += `<div>滑轮组: ${record.pulleyGroupId}</div>`;
          html += `<div>状态: ${statusMap[record.processingStatus]}</div>`;
          html += `<div>原因: ${record.statusReason}</div>`;
          if (record.isJumpPoint) {
            html += `<div style="color:#eb2f96;">跳变原因: ${record.jumpCause ? causeMap[record.jumpCause] : '未知'}</div>`;
          }
          return html;
        },
      },
      legend: {
        data: ['正常数据', '异常数据', '跳变点'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: '张力 (kN)',
      },
      series: [
        {
          name: '正常数据',
          type: 'line',
          data: normalData,
          smooth: true,
          lineStyle: { color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
          symbol: 'circle',
          symbolSize: 4,
        },
        {
          name: '异常数据',
          type: 'scatter',
          data: abnormalData,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: (params: unknown) => {
              const p = params as { dataIndex: number };
              const record = sorted[p.dataIndex];
              return record ? STATUS_COLORS[record.processingStatus] : '#ff4d4f';
            },
          },
        },
        {
          name: '跳变点',
          type: 'scatter',
          data: jumpPoints,
          symbol: 'diamond',
          symbolSize: 14,
          itemStyle: {
            color: '#eb2f96',
            borderColor: '#fff',
            borderWidth: 2,
          },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 40,
        },
      ],
    };
  }, [records]);

  return (
    <div className="tension-chart">
      <ReactECharts 
        option={option} 
        style={{ height: '400px', width: '100%' }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
};
