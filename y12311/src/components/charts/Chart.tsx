import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface ChartProps {
  option: EChartsOption;
  className?: string;
  height?: number;
  onChartReady?: (chart: echarts.ECharts) => void;
}

const Chart: React.FC<ChartProps> = ({
  option,
  className,
  height = 300,
  onChartReady,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
      onChartReady?.(chartInstance.current);
    }

    const chart = chartInstance.current;
    chart.setOption(option, { notMerge: true, lazyUpdate: true });

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstance.current = null;
    };
  }, [option, onChartReady]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ height: `${height}px`, width: '100%' }}
    />
  );
};

export default Chart;
