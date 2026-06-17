import { useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, PieSeriesOption } from 'echarts';
import type { TrackStatus } from '@/types';

export interface StatusPieChartProps {
  data: Array<{ status: TrackStatus; count: number }>;
  onStatusClick?: (status: TrackStatus) => void;
  height?: number | string;
}

const STATUS_COLORS: Record<TrackStatus, string> = {
  pending: '#8c8c8c',
  matching: '#1677ff',
  matched: '#1677ff',
  mismatch: '#ff4d4f',
  reviewing: '#faad14',
  suspended: '#ff4d4f',
  approved: '#52c41a',
  rejected: '#ff4d4f',
};

const STATUS_LABELS: Record<TrackStatus, string> = {
  pending: '待处理',
  matching: '匹配中',
  matched: '已匹配',
  mismatch: '匹配失败',
  reviewing: '审核中',
  suspended: '已暂停',
  approved: '已通过',
  rejected: '已拒绝',
};

const StatusPieChart: React.FC<StatusPieChartProps> = ({
  data,
  onStatusClick,
  height = 300,
}) => {
  const chartData = useMemo<PieSeriesOption['data']>(
    () =>
      data.map((item) => ({
        value: item.count,
        name: STATUS_LABELS[item.status] || item.status,
        itemStyle: {
          color: STATUS_COLORS[item.status],
        },
        status: item.status,
      })),
    [data]
  );

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(42, 42, 42, 0.95)',
        borderColor: '#424242',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.65)',
        },
        itemGap: 12,
      },
      series: [
        {
          name: '状态分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#1f1f1f',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: 'rgba(255, 255, 255, 0.85)',
              formatter: '{b}\n{c}',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          labelLine: {
            show: false,
          },
          data: chartData,
        },
      ],
    }),
    [chartData]
  );

  const handleClick = useCallback(
    (params: { name?: string; data?: { status?: TrackStatus } }) => {
      if (onStatusClick && params.data?.status) {
        onStatusClick(params.data.status);
      }
    },
    [onStatusClick]
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
      style={{ height, width: '100%' }}
      onEvents={onEvents}
      theme="dark"
    />
  );
};

export default StatusPieChart;
