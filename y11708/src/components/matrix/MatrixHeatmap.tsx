import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TransitionMatrix } from '../../types';
import { formatPercent } from '../../utils/cn';

interface MatrixHeatmapProps {
  matrix: TransitionMatrix;
  onCellClick?: (from: number, to: number) => void;
}

export const MatrixHeatmap: React.FC<MatrixHeatmapProps> = ({ matrix, onCellClick }) => {
  const [hoveredCell, setHoveredCell] = useState<{ from: number; to: number } | null>(null);

  const option: EChartsOption = {
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const fromState = matrix.states[params.data[1]];
        const toState = matrix.states[params.data[0]];
        const value = params.data[2];
        const count = matrix.counts[params.data[1]][params.data[0]];
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">
              ${fromState.name} → ${toState.name}
            </div>
            <div>概率: ${formatPercent(value)}</div>
            <div>样本数: ${count}</div>
          </div>
        `;
      }
    },
    grid: {
      left: 100,
      top: 80,
      right: 40,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      data: matrix.states.map(s => s.name),
      splitArea: { show: true },
      axisLabel: {
        rotate: 30,
        fontSize: 12,
        color: '#374151'
      },
      name: '转移至',
      nameLocation: 'middle',
      nameGap: 50,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937'
      }
    },
    yAxis: {
      type: 'category',
      data: matrix.states.map(s => s.name),
      splitArea: { show: true },
      axisLabel: {
        fontSize: 12,
        color: '#374151'
      },
      name: '当前状态',
      nameLocation: 'middle',
      nameGap: 70,
      nameTextStyle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937'
      }
    },
    visualMap: {
      min: 0,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      text: ['高', '低'],
      textStyle: {
        color: '#6B7280'
      },
      inRange: {
        color: ['#F3F4F6', '#E0E7FF', '#818CF8', '#4F46E5', '#3730A3']
      }
    },
    series: [{
      name: '转移概率',
      type: 'heatmap',
      data: matrix.matrix.flatMap((row, i) =>
        row.map((value, j) => [j, i, value])
      ),
      label: {
        show: true,
        formatter: (params: any) => formatPercent(params.data[2]),
        fontSize: 11,
        color: '#374151'
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      itemStyle: {
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#fff'
      }
    }]
  };

  const onEvents = {
    click: (params: any) => {
      if (onCellClick && params.data) {
        onCellClick(params.data[1], params.data[0]);
      }
    },
    mouseover: (params: any) => {
      if (params.data) {
        setHoveredCell({ from: params.data[1], to: params.data[0] });
      }
    },
    mouseout: () => {
      setHoveredCell(null);
    }
  };

  return (
    <div className="w-full h-[480px]">
      <ReactECharts
        option={option}
        onEvents={onEvents}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
      {hoveredCell && (
        <div className="mt-2 text-sm text-gray-600 text-center">
          选中: {matrix.states[hoveredCell.from]?.name} → {matrix.states[hoveredCell.to]?.name}
        </div>
      )}
    </div>
  );
};
