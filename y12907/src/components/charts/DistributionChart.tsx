import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import { AnalysisResult, SampleSourceType, AnomalyType, sourceTypeLabels, anomalyTypeLabels } from '../../types';

interface DistributionChartProps {
  analysisResult: AnalysisResult;
  onDataPointClick?: (type: string, value: string) => void;
  highlightKey?: string | null;
}

// 拒答原因分布图表
export const DistributionChart: React.FC<DistributionChartProps> = ({
  analysisResult,
  onDataPointClick,
  highlightKey
}) => {
  const { bySourceType, byAnomalyType } = analysisResult.distributionStats;

  const option = useMemo(() => {
    const sourceData = Object.entries(bySourceType).map(([key, value]) => ({
      name: sourceTypeLabels[key as SampleSourceType],
      value,
      itemStyle: highlightKey === key ? {
        color: '#f59e0b',
        shadowBlur: 10,
        shadowColor: 'rgba(245, 158, 11, 0.5)'
      } : undefined
    }));

    const anomalyData = Object.entries(byAnomalyType).map(([key, value]) => ({
      name: anomalyTypeLabels[key as AnomalyType],
      value,
      itemStyle: highlightKey === key ? {
        color: '#ef4444',
        shadowBlur: 10,
        shadowColor: 'rgba(239, 68, 68, 0.5)'
      } : undefined
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}条 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 10,
        top: 'center',
        textStyle: {
          fontFamily: '"Source Han Sans CN", sans-serif',
          fontSize: 12
        }
      },
      grid: {
        left: '50%',
        right: '10%',
        top: '15%',
        bottom: '15%'
      },
      series: [
        {
          name: '数据来源分布',
          type: 'pie',
          radius: ['0%', '45%'],
          center: ['35%', '50%'],
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{c}条',
            fontSize: 11
          },
          data: sourceData,
          color: ['#1e3a5f', '#10b981', '#64748b', '#f59e0b'],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        },
        {
          name: '异常类型分布',
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['35%', '50%'],
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}\n{c}条',
            fontSize: 11
          },
          data: anomalyData,
          color: ['#ef4444', '#f59e0b', '#f97316', '#8b5cf6'],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  }, [bySourceType, byAnomalyType, highlightKey]);

  const handleClick = (params: any) => {
    if (onDataPointClick) {
      const typeKey = Object.keys(sourceTypeLabels).find(
        key => sourceTypeLabels[key as SampleSourceType] === params.name
      ) || Object.keys(anomalyTypeLabels).find(
        key => anomalyTypeLabels[key as AnomalyType] === params.name
      );
      if (typeKey) {
        onDataPointClick(params.seriesName.includes('来源') ? 'source' : 'anomaly', typeKey);
      }
    }
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '320px', width: '100%' }}
      onEvents={{ click: handleClick }}
      opts={{ renderer: 'canvas' }}
    />
  );
};
