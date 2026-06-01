import * as React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, ECharts } from 'echarts';
import { cn } from '@/lib/utils';

interface BaseChartProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  onChartReady?: (chart: ECharts) => void;
  onEvents?: Record<string, (params: any) => void>;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  showLoading?: boolean;
  loadingText?: string;
}

const baseTheme: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  textStyle: {
    color: '#94A3B8',
    fontFamily: '"Noto Sans SC", system-ui, sans-serif',
  },
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderColor: '#334155',
    borderWidth: 1,
    textStyle: {
      color: '#E2E8F0',
    },
  },
  legend: {
    textStyle: {
      color: '#94A3B8',
    },
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
  xAxis: {
    axisLine: {
      lineStyle: {
        color: '#334155',
      },
    },
    axisLabel: {
      color: '#94A3B8',
    },
    splitLine: {
      lineStyle: {
        color: '#1E293B',
      },
    },
  },
  yAxis: {
    axisLine: {
      lineStyle: {
        color: '#334155',
      },
    },
    axisLabel: {
      color: '#94A3B8',
    },
    splitLine: {
      lineStyle: {
        color: '#1E293B',
      },
    },
  },
};

export const BaseChart: React.FC<BaseChartProps> = ({
  option,
  style,
  className,
  onChartReady,
  onEvents,
  notMerge = false,
  lazyUpdate = false,
  showLoading = false,
  loadingText = '加载中...',
}) => {
  const chartRef = React.useRef<ReactECharts>(null);

  const mergedOption = React.useMemo<EChartsOption>(() => {
    return {
      ...baseTheme,
      ...option,
    };
  }, [option]);

  React.useEffect(() => {
    if (chartRef.current && showLoading) {
      const chart = chartRef.current.getEchartsInstance();
      chart.showLoading('default', {
        text: loadingText,
        color: '#3B82F6',
        textColor: '#94A3B8',
        maskColor: 'rgba(15, 23, 42, 0.8)',
      });
    } else if (chartRef.current && !showLoading) {
      const chart = chartRef.current.getEchartsInstance();
      chart.hideLoading();
    }
  }, [showLoading, loadingText]);

  const handleChartReady = (chart: ECharts) => {
    onChartReady?.(chart);
  };

  return (
    <div className={cn('w-full h-full', className)}>
      <ReactECharts
        ref={chartRef}
        option={mergedOption}
        style={style || { height: '100%', width: '100%' }}
        onChartReady={handleChartReady}
        onEvents={onEvents}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  );
};
