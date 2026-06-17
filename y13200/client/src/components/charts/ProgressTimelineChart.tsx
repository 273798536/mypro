import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, LineSeriesOption } from 'echarts';
import dayjs from 'dayjs';

export interface TimelineData {
  date: string;
  submissions: number;
  reviews: number;
}

export interface ProgressTimelineChartProps {
  data: TimelineData[];
  height?: number | string;
}

const ProgressTimelineChart: React.FC<ProgressTimelineChartProps> = ({
  data,
  height = 300,
}) => {
  const sortedData = useMemo(
    () => [...data].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()),
    [data]
  );

  const xAxisData = useMemo(
    () => sortedData.map((item) => dayjs(item.date).format('MM-DD')),
    [sortedData]
  );

  const submissionData = useMemo(
    () => sortedData.map((item) => item.submissions),
    [sortedData]
  );

  const reviewData = useMemo(
    () => sortedData.map((item) => item.reviews),
    [sortedData]
  );

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(42, 42, 42, 0.95)',
        borderColor: '#424242',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
        },
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#2a2a2a',
            color: 'rgba(255, 255, 255, 0.85)',
          },
        },
      },
      legend: {
        data: ['提交数', '审核数'],
        top: 0,
        right: 0,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
        axisLine: {
          lineStyle: {
            color: '#424242',
          },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: '数量',
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
        axisLine: {
          lineStyle: {
            color: '#424242',
          },
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
        splitLine: {
          lineStyle: {
            color: '#303030',
          },
        },
      },
      series: [
        {
          name: '提交数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: submissionData as LineSeriesOption['data'],
          lineStyle: {
            width: 3,
            color: '#1677ff',
          },
          itemStyle: {
            color: '#1677ff',
            borderWidth: 2,
            borderColor: '#1f1f1f',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(22, 119, 255, 0.3)',
                },
                {
                  offset: 1,
                  color: 'rgba(22, 119, 255, 0)',
                },
              ],
            },
          },
        },
        {
          name: '审核数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: reviewData as LineSeriesOption['data'],
          lineStyle: {
            width: 3,
            color: '#52c41a',
          },
          itemStyle: {
            color: '#52c41a',
            borderWidth: 2,
            borderColor: '#1f1f1f',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(82, 196, 26, 0.3)',
                },
                {
                  offset: 1,
                  color: 'rgba(82, 196, 26, 0)',
                },
              ],
            },
          },
        },
      ],
    }),
    [xAxisData, submissionData, reviewData]
  );

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      theme="dark"
    />
  );
};

export default ProgressTimelineChart;
