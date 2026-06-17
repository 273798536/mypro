import { useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, BarSeriesOption } from 'echarts';

export interface TimecodeDeviationData {
  trackId: string;
  trackNo: number;
  title: string;
  deviation: number;
}

export interface TimecodeDeviationChartProps {
  data: TimecodeDeviationData[];
  onTrackClick?: (trackId: string) => void;
  height?: number | string;
}

const getBarColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation <= 100) return '#52c41a';
  if (absDeviation <= 500) return '#faad14';
  return '#ff4d4f';
};

const TimecodeDeviationChart: React.FC<TimecodeDeviationChartProps> = ({
  data,
  onTrackClick,
  height = 400,
}) => {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.trackNo - b.trackNo),
    [data]
  );

  const xAxisData = useMemo(
    () => sortedData.map((item) => `${item.trackNo}. ${item.title.slice(0, 8)}${item.title.length > 8 ? '...' : ''}`),
    [sortedData]
  );

  const seriesData = useMemo<BarSeriesOption['data']>(
    () =>
      sortedData.map((item) => ({
        value: item.deviation,
        itemStyle: {
          color: getBarColor(item.deviation),
          borderRadius: [4, 4, 0, 0],
        },
        trackId: item.trackId,
      })),
    [sortedData]
  );

  const maxDeviation = useMemo(() => {
    if (data.length === 0) return 600;
    const max = Math.max(...data.map((d) => Math.abs(d.deviation)));
    return Math.max(max + 100, 600);
  }, [data]);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: 'rgba(42, 42, 42, 0.95)',
        borderColor: '#424242',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
        },
        formatter: (params: unknown) => {
          const param = (params as Array<{ name: string; value: number; color: string }>)[0];
          if (!param) return '';
          const deviation = param.value;
          const status =
            Math.abs(deviation) <= 100
              ? '正常'
              : Math.abs(deviation) <= 500
              ? '警告'
              : '异常';
          return `${param.name}<br/>偏差: <span style="color:${param.color}">${deviation > 0 ? '+' : ''}${deviation}ms</span><br/>状态: ${status}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLine: {
          lineStyle: {
            color: '#424242',
          },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.65)',
          rotate: 45,
          fontSize: 11,
          interval: 0,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: '偏差 (ms)',
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
        max: maxDeviation,
        min: -maxDeviation,
        axisLine: {
          lineStyle: {
            color: '#424242',
          },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.65)',
          formatter: '{value}',
        },
        splitLine: {
          lineStyle: {
            color: '#303030',
          },
        },
      },
      series: [
        {
          name: '时间码偏差',
          type: 'bar',
          data: seriesData,
          barWidth: '60%',
          markLine: {
            symbol: 'none',
            silent: true,
            data: [
              {
                yAxis: 500,
                lineStyle: {
                  color: '#ff4d4f',
                  type: 'dashed',
                  width: 2,
                },
                label: {
                  formatter: '+500ms',
                  position: 'end',
                  color: '#ff4d4f',
                  fontSize: 12,
                },
              },
              {
                yAxis: -500,
                lineStyle: {
                  color: '#ff4d4f',
                  type: 'dashed',
                  width: 2,
                },
                label: {
                  formatter: '-500ms',
                  position: 'end',
                  color: '#ff4d4f',
                  fontSize: 12,
                },
              },
              {
                yAxis: 100,
                lineStyle: {
                  color: '#52c41a',
                  type: 'dotted',
                  width: 1,
                },
                label: {
                  show: false,
                },
              },
              {
                yAxis: -100,
                lineStyle: {
                  color: '#52c41a',
                  type: 'dotted',
                  width: 1,
                },
                label: {
                  show: false,
                },
              },
            ],
          },
        },
      ],
    }),
    [xAxisData, seriesData, maxDeviation]
  );

  const handleClick = useCallback(
    (params: { data?: { trackId?: string } }) => {
      if (onTrackClick && params.data?.trackId) {
        onTrackClick(params.data.trackId);
      }
    },
    [onTrackClick]
  );

  const onEvents = useMemo(
    () => ({
      click: handleClick,
    }),
    [handleClick]
  );

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%', cursor: 'pointer' }}
      onEvents={onEvents}
      theme="dark"
    />
  );
};

export default TimecodeDeviationChart;
