import ReactECharts from 'echarts-for-react';
import type { ForecastResult, ReplenishmentSuggestion } from '@/types';

interface ForecastSeries {
  dates: string[];
  historical: number[];
  forecastMean: number[];
  forecastLower: number[];
  forecastUpper: number[];
}

interface ForecastChartProps {
  series: ForecastSeries;
  safetyStock: number;
}

export default function ForecastChart({ series, safetyStock }: ForecastChartProps) {
  const { dates, historical, forecastMean, forecastLower, forecastUpper } = series;
  
  const safetyStockLine = new Array(dates.length).fill(null);
  const lastIndex = dates.findIndex((_, i) => historical[i] === null);
  if (lastIndex >= 0 && lastIndex < safetyStockLine.length) {
    for (let i = lastIndex; i < safetyStockLine.length; i++) {
      safetyStockLine[i] = safetyStock;
    }
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 59, 95, 0.95)',
      borderColor: '#0F3B5F',
      textStyle: {
        color: '#fff',
        fontFamily: 'Inter',
      },
    },
    legend: {
      data: ['历史销量', '预测均值', '95%置信区间', '安全库存'],
      bottom: 0,
      textStyle: {
        fontFamily: 'Inter',
        fontSize: 11,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#CBD5E1',
        },
      },
      axisLabel: {
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
        color: '#64748B',
        rotate: 45,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false,
      },
      axisLabel: {
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
        color: '#64748B',
      },
      splitLine: {
        lineStyle: {
          color: '#F1F5F9',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '历史销量',
        type: 'line',
        data: historical,
        lineStyle: {
          color: '#2C74A4',
          width: 2,
        },
        itemStyle: {
          color: '#2C74A4',
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: '预测均值',
        type: 'line',
        data: forecastMean,
        lineStyle: {
          color: '#8B5CF6',
          width: 2,
          type: 'dashed',
        },
        itemStyle: {
          color: '#8B5CF6',
        },
        symbol: 'diamond',
        symbolSize: 5,
      },
      {
        name: '95%置信区间',
        type: 'line',
        data: forecastUpper,
        lineStyle: {
          color: 'transparent',
        },
        itemStyle: {
          color: 'transparent',
        },
        stack: 'confidence',
      },
      {
        name: '95%置信区间',
        type: 'line',
        data: forecastLower.map((v, i) => {
          const upper = forecastUpper[i];
          if (upper === null || v === null) return null;
          return (upper as number) - (v as number);
        }),
        lineStyle: {
          color: 'transparent',
        },
        itemStyle: {
          color: 'transparent',
        },
        areaStyle: {
          color: 'rgba(139, 92, 246, 0.15)',
        },
        stack: 'confidence',
      },
      {
        name: '安全库存',
        type: 'line',
        data: safetyStockLine,
        lineStyle: {
          color: '#EF4444',
          width: 1.5,
          type: 'dotted',
        },
        itemStyle: {
          color: 'transparent',
        },
        symbol: 'none',
      },
    ],
  };
  
  return <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'svg' }} />;
}
