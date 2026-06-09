import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { CrossSectionData } from '@/types';

interface CrossSectionViewerProps {
  crossSection: CrossSectionData;
  height?: string;
}

export default function CrossSectionViewer({
  crossSection,
  height = '350px',
}: CrossSectionViewerProps) {
  const option = useMemo(() => {
    const { points, plane, boundaries } = crossSection;

    let xData: number[] = [];
    let yData: number[] = [];
    let xLabel = '';
    let yLabel = '';

    if (plane === 'XY') {
      xData = points.map((p) => p.x);
      yData = points.map((p) => p.y);
      xLabel = 'X轴 (m)';
      yLabel = 'Y轴 (m)';
    } else if (plane === 'XZ') {
      xData = points.map((p) => p.x);
      yData = points.map((p) => p.z);
      xLabel = 'X轴 (m)';
      yLabel = 'Z轴 (m)';
    } else {
      xData = points.map((p) => p.y);
      yData = points.map((p) => p.z);
      xLabel = 'Y轴 (m)';
      yLabel = 'Z轴 (m)';
    }

    const scatterData = xData.map((x, i) => [x, yData[i]]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: { value: number[] }) => {
          return `${xLabel.replace(' (m)', '')}: ${params.value[0].toFixed(3)}m<br/>${yLabel.replace(' (m)', '')}: ${params.value[1].toFixed(3)}m`;
        },
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        textStyle: { color: '#e2e8f0' },
      },
      grid: {
        left: '10%',
        right: '5%',
        top: '10%',
        bottom: '15%',
      },
      xAxis: {
        name: xLabel,
        nameTextStyle: { color: '#718096', fontSize: 11 },
        type: 'value',
        axisLine: { lineStyle: { color: '#4a5568' } },
        axisLabel: { color: '#a0aec0', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(74, 85, 104, 0.3)' } },
        min: Math.floor(Math.min(boundaries.minX, boundaries.minY, boundaries.minZ) * 10) / 10 - 0.5,
        max: Math.ceil(Math.max(boundaries.maxX, boundaries.maxY, boundaries.maxZ) * 10) / 10 + 0.5,
      },
      yAxis: {
        name: yLabel,
        nameTextStyle: { color: '#718096', fontSize: 11 },
        type: 'value',
        axisLine: { lineStyle: { color: '#4a5568' } },
        axisLabel: { color: '#a0aec0', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(74, 85, 104, 0.3)' } },
        scale: true,
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: 6,
          itemStyle: {
            color: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                { offset: 0, color: 'rgba(96, 165, 250, 0.9)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.6)' },
              ],
            },
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
          },
        },
      ],
    };
  }, [crossSection]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden bg-tech-gray-900/40 border border-white/10"
      style={{ height }}
    >
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
