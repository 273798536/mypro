import React, { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Calendar, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import type { PredictionRecord } from '../../types';
import { aggregateByDate, isCovered } from '../../utils/calculations';
import { formatNumber, formatDate } from '../../utils/formatters';

interface CoverageChartProps {
  records: PredictionRecord[];
  highlightedDate: string | null;
  onDateClick: (date: string) => void;
  selectedCategory?: string;
}

const CoverageChart: React.FC<CoverageChartProps> = ({ 
  records, 
  highlightedDate,
  onDateClick,
  selectedCategory 
}) => {
  const chartRef = useRef<ReactECharts>(null);

  const aggregatedData = useMemo(() => {
    return aggregateByDate(records);
  }, [records]);

  const chartOption: EChartsOption = useMemo(() => {
    const dates = aggregatedData.map(r => r.date);
    const predictedValues = aggregatedData.map(r => r.predictedValue);
    const lowerBounds = aggregatedData.map(r => r.lowerBound);
    const upperBounds = aggregatedData.map(r => r.upperBound);
    const actualValues = aggregatedData.map(r => r.actualValue);
    
    const uncoveredPoints = aggregatedData
      .filter(r => !isCovered(r))
      .map(r => ({
        value: [r.date, r.actualValue],
        itemStyle: { color: '#ef4444' }
      }));

    const promotionPoints = aggregatedData
      .filter(r => r.isPromotion)
      .map(r => ({
        value: [r.date, r.actualValue],
        itemStyle: { 
          color: '#8b5cf6',
          borderColor: '#fff',
          borderWidth: 2
        }
      }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#1e293b',
          fontSize: 13
        },
        formatter: (params: any) => {
          const date = params[0].axisValue;
          const data = aggregatedData.find(r => r.date === date);
          if (!data) return '';
          
          const covered = isCovered(data);
          return `
            <div style="font-weight: 600; margin-bottom: 8px;">${formatDate(date)}</div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #64748b;">预测值:</span>
              <span style="font-family: monospace; font-weight: 500;">${formatNumber(data.predictedValue)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #64748b;">预测区间:</span>
              <span style="font-family: monospace; color: #3b82f6;">${formatNumber(data.lowerBound)} - ${formatNumber(data.upperBound)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span style="color: #64748b;">实际值:</span>
              <span style="font-family: monospace; font-weight: 500; color: ${covered ? '#10b981' : '#ef4444'}">${formatNumber(data.actualValue)}</span>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              <span style="color: ${covered ? '#10b981' : '#ef4444'}; font-weight: 500;">
                ${covered ? '✓ 区间内' : '✗ 区间外'}
              </span>
              ${data.isPromotion ? '<span style="margin-left: 8px; color: #8b5cf6;">⚡ 促销日</span>' : ''}
            </div>
          `;
        }
      },
      legend: {
        data: ['预测值', '实际值', '预测区间', '未覆盖点', '促销日'],
        bottom: 0,
        textStyle: {
          color: '#64748b',
          fontSize: 12
        }
      },
      grid: {
        left: 60,
        right: 40,
        top: 40,
        bottom: 60
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: { color: '#e2e8f0' }
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          rotate: 45
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          formatter: (value: number) => formatNumber(value)
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            type: 'dashed'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 40,
          borderColor: 'transparent',
          fillerColor: 'rgba(59, 130, 246, 0.1)',
          handleStyle: {
            color: '#3b82f6'
          }
        }
      ],
      series: [
        {
          name: '预测区间',
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const xValue = api.value(0);
            const low = api.value(1);
            const high = api.value(2);
            const start = api.coord([xValue, low]);
            const end = api.coord([xValue, high]);
            const width = 2;
            
            return {
              type: 'rect',
              shape: {
                x: start[0] - width / 2,
                y: end[1],
                width,
                height: start[1] - end[1]
              },
              style: {
                fill: 'rgba(59, 130, 246, 0.3)',
                stroke: 'transparent'
              }
            };
          },
          data: dates.map((date, i) => [date, lowerBounds[i], upperBounds[i]]),
          silent: true,
          z: 1
        },
        {
          name: '预测值',
          type: 'line',
          data: predictedValues,
          lineStyle: {
            color: '#3b82f6',
            width: 2,
            type: 'dashed'
          },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 6,
          z: 2
        },
        {
          name: '实际值',
          type: 'line',
          data: actualValues,
          lineStyle: {
            color: '#10b981',
            width: 2
          },
          itemStyle: { color: '#10b981' },
          symbol: 'circle',
          symbolSize: 6,
          z: 3
        },
        {
          name: '未覆盖点',
          type: 'scatter',
          data: uncoveredPoints,
          symbol: 'circle',
          symbolSize: 12,
          z: 4
        },
        {
          name: '促销日',
          type: 'scatter',
          data: promotionPoints,
          symbol: 'diamond',
          symbolSize: 14,
          z: 5
        }
      ]
    };
  }, [aggregatedData]);

  const onChartClick = (params: any) => {
    if (params.name) {
      onDateClick(params.name);
    }
  };

  const handleZoomIn = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      const option = chart.getOption();
      const dataZoom = option.dataZoom as any[];
      const range = dataZoom[0].end - dataZoom[0].start;
      const newRange = Math.max(range - 20, 20);
      const center = (dataZoom[0].start + dataZoom[0].end) / 2;
      chart.dispatchAction({
        type: 'dataZoom',
        start: Math.max(0, center - newRange / 2),
        end: Math.min(100, center + newRange / 2)
      });
    }
  };

  const handleZoomOut = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      chart.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
    }
  };

  const handleReset = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      chart.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
    }
    onDateClick('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">预测区间趋势</h3>
            {selectedCategory && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {selectedCategory}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="重置"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
        {highlightedDate && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span>已选中: {formatDate(highlightedDate)}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <ReactECharts
          ref={chartRef}
          option={chartOption}
          style={{ height: '400px' }}
          onEvents={{
            click: onChartClick
          }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      <div className="px-4 pb-4 flex items-center justify-between text-xs text-slate-500">
        <span>💡 点击数据点可查看详情并联动异常列表</span>
        <span>拖动底部滑块可缩放时间范围</span>
      </div>
    </div>
  );
};

export default CoverageChart;
