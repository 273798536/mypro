import ReactECharts from 'echarts-for-react';

interface GaugeChartProps {
  value: number;
  title: string;
  max?: number;
  unit?: string;
}

export default function GaugeChart({ value, title, max = 100, unit = '分' }: GaugeChartProps) {
  const getColor = (v: number) => {
    if (v >= 80) return '#10B981';
    if (v >= 60) return '#F59E0B';
    if (v >= 40) return '#F97316';
    return '#EF4444';
  };
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max,
        splitNumber: 5,
        center: ['50%', '70%'],
        radius: '100%',
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [0.4, '#EF4444'],
              [0.6, '#F97316'],
              [0.8, '#F59E0B'],
              [1, '#10B981'],
            ],
          },
        },
        pointer: {
          length: '60%',
          width: 4,
          itemStyle: {
            color: '#0F3B5F',
          },
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          valueAnimation: true,
          formatter: `{value}${unit}`,
          offsetCenter: [0, '-10%'],
          fontSize: 28,
          fontWeight: 'bold',
          fontFamily: 'JetBrains Mono',
          color: getColor(value),
        },
        data: [
          {
            value,
          },
        ],
      },
    ],
  };
  
  return (
    <div className="relative">
      <ReactECharts option={option} style={{ height: 160 }} opts={{ renderer: 'svg' }} />
      <p className="text-center text-sm text-neutral-600 font-medium -mt-4">{title}</p>
    </div>
  );
}
