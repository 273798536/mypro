import { useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { SchemeParams, QueueResult } from '@/types';
import { calcCounterRange, calcArrivalRateRange } from '@/utils/queueTheory';
import { Download } from 'lucide-react';

interface Props {
  params: SchemeParams;
  result: QueueResult | null;
}

type ChartType = 'counters' | 'arrival' | 'utilization';

export default function ChartContainer({ params, result }: Props) {
  const chartRef = useRef<ReactECharts>(null);
  const [chartType, setChartType] = useState<ChartType>('counters');

  const getOption = () => {
    const baseStyle = {
      textStyle: { color: '#94A3B8', fontFamily: 'system-ui' },
      backgroundColor: 'transparent',
    };

    if (chartType === 'counters') {
      const minC = Math.max(1, params.numCounters - 4);
      const maxC = params.numCounters + 4;
      const data = calcCounterRange(params, minC, maxC);

      return {
        ...baseStyle,
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#1E293B',
          borderColor: '#334155',
          textStyle: { color: '#E2E8F0' },
          formatter: (params: any) => {
            const c = params[0].axisValue;
            return `柜台数: ${c}<br/>等待时间: ${params[0].value.toFixed(2)} 分钟<br/>队列长度: ${params[1].value.toFixed(2)} 人`;
          },
        },
        legend: {
          data: ['等待时间(分钟)', '队列长度(人)'],
          textStyle: { color: '#94A3B8' },
          top: 0,
        },
        grid: { left: 50, right: 50, top: 40, bottom: 30 },
        xAxis: {
          type: 'category',
          data: data.map((d) => d.c),
          name: '柜台数',
          nameTextStyle: { color: '#64748B' },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94A3B8' },
        },
        yAxis: [
          {
            type: 'value',
            name: '等待时间',
            nameTextStyle: { color: '#64748B' },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#94A3B8' },
            splitLine: { lineStyle: { color: '#1E293B' } },
          },
          {
            type: 'value',
            name: '队列长度',
            nameTextStyle: { color: '#64748B' },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#94A3B8' },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: '等待时间(分钟)',
            type: 'line',
            data: data.map((d) => Number(d.result.Wq.toFixed(2))),
            smooth: true,
            lineStyle: { color: '#D4A843', width: 2 },
            itemStyle: { color: '#D4A843' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(212,168,67,0.3)' },
                  { offset: 1, color: 'rgba(212,168,67,0.02)' },
                ],
              },
            },
            markPoint: {
              data: [{ type: 'min', name: '最小' }],
              itemStyle: { color: '#22C55E' },
            },
          },
          {
            name: '队列长度(人)',
            type: 'bar',
            yAxisIndex: 1,
            data: data.map((d) => Number(d.result.Lq.toFixed(2))),
            itemStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(6,182,212,0.6)' },
                  { offset: 1, color: 'rgba(6,182,212,0.1)' },
                ],
              },
              borderRadius: [4, 4, 0, 0],
            },
            barWidth: '40%',
          },
        ],
      };
    }

    if (chartType === 'arrival') {
      const minLambda = Math.max(0.5, params.arrivalRate - 3);
      const maxLambda = params.arrivalRate + 5;
      const data = calcArrivalRateRange(params, minLambda, maxLambda, 0.5);

      return {
        ...baseStyle,
        tooltip: {
          trigger: 'axis',
          backgroundColor: '#1E293B',
          borderColor: '#334155',
          textStyle: { color: '#E2E8F0' },
        },
        legend: {
          data: ['等待时间', '队列长度'],
          textStyle: { color: '#94A3B8' },
          top: 0,
        },
        grid: { left: 50, right: 50, top: 40, bottom: 30 },
        xAxis: {
          type: 'category',
          data: data.map((d) => d.lambda),
          name: '到达率 (人/分钟)',
          nameTextStyle: { color: '#64748B' },
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94A3B8' },
        },
        yAxis: [
          {
            type: 'value',
            name: '等待(分钟)',
            nameTextStyle: { color: '#64748B' },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#94A3B8' },
            splitLine: { lineStyle: { color: '#1E293B' } },
          },
          {
            type: 'value',
            name: '队列(人)',
            nameTextStyle: { color: '#64748B' },
            axisLine: { lineStyle: { color: '#475569' } },
            axisLabel: { color: '#94A3B8' },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: '等待时间',
            type: 'line',
            data: data.map((d) => Number(d.result.Wq.toFixed(2))),
            smooth: true,
            lineStyle: { color: '#D4A843', width: 2 },
            itemStyle: { color: '#D4A843' },
            markLine: {
              data: [{ xAxis: params.arrivalRate, lineStyle: { color: '#EF4444' }, label: { formatter: '当前' } }],
            },
          },
          {
            name: '队列长度',
            type: 'line',
            yAxisIndex: 1,
            data: data.map((d) => Number(d.result.Lq.toFixed(2))),
            smooth: true,
            lineStyle: { color: '#06B6D4', width: 2 },
            itemStyle: { color: '#06B6D4' },
          },
        ],
      };
    }

    if (chartType === 'utilization' && result) {
      return {
        ...baseStyle,
        tooltip: {
          trigger: 'item',
          backgroundColor: '#1E293B',
          borderColor: '#334155',
          textStyle: { color: '#E2E8F0' },
        },
        series: [
          {
            type: 'gauge',
            center: ['50%', '55%'],
            radius: '85%',
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            progress: { show: true, width: 18 },
            axisLine: {
              lineStyle: {
                width: 18,
                color: [
                  [0.5, '#22C55E'],
                  [0.8, '#D4A843'],
                  [1, '#EF4444'],
                ],
              },
            },
            pointer: { itemStyle: { color: '#E2E8F0' } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: {
              valueAnimation: true,
              offsetCenter: [0, '30%'],
              fontSize: 36,
              fontWeight: 'bold',
              color: '#D4A843',
              formatter: '{value}%',
            },
            data: [{ value: Number((result.utilization * 100).toFixed(1)) }],
          },
        ],
      };
    }

    return {};
  };

  const handleExport = (format: 'png' | 'svg') => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    const url = chart.getDataURL({
      type: format,
      pixelRatio: 2,
      backgroundColor: '#1A2332',
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-${chartType}.${format}`;
    a.click();
  };

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-400">图表分析</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {[
              { key: 'counters', label: '柜台数' },
              { key: 'arrival', label: '到达率' },
              { key: 'utilization', label: '利用率' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setChartType(t.key as ChartType)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  chartType === t.key
                    ? 'bg-amber-600 text-slate-900 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => handleExport('png')}
              className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
              title="导出 PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleExport('svg')}
              className="p-2 text-slate-400 hover:text-amber-400 transition-colors text-xs font-medium"
              title="导出 SVG"
            >
              SVG
            </button>
          </div>
        </div>
      </div>
      <ReactECharts
        ref={chartRef}
        option={getOption()}
        style={{ height: 320 }}
        notMerge
      />
    </div>
  );
}
