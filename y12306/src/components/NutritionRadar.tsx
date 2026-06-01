import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Nutrition, NUTRITION_LABELS } from '../types';

interface NutritionRadarProps {
  actual: Nutrition;
  target?: Partial<Nutrition>;
  height?: number;
}

export const NutritionRadar: React.FC<NutritionRadarProps> = ({
  actual,
  target,
  height = 300,
}) => {
  const indicators = [
    { key: 'calories', max: 1500 },
    { key: 'protein', max: 80 },
    { key: 'fat', max: 60 },
    { key: 'carbs', max: 200 },
    { key: 'fiber', max: 20 },
    { key: 'calcium', max: 500 },
    { key: 'iron', max: 20 },
    { key: 'vitaminC', max: 100 },
  ];

  const actualData = indicators.map((i) => actual[i.key as keyof Nutrition] || 0);
  const targetData = target
    ? indicators.map((i) => target[i.key as keyof Nutrition] || 0)
    : [];

  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      data: target ? ['实际营养', '目标值'] : ['实际营养'],
      bottom: 0,
    },
    radar: {
      indicator: indicators.map((i) => ({
        name: NUTRITION_LABELS[i.key as keyof Nutrition].replace(/\(.*\)/, ''),
        max: i.max,
      })),
      center: ['50%', '45%'],
      radius: '60%',
      splitNumber: 4,
      axisName: {
        color: '#4E5969',
        fontSize: 11,
      },
      splitArea: {
        areaStyle: {
          color: ['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6'],
        },
      },
    },
    series: [
      {
        name: '营养对比',
        type: 'radar',
        data: [
          {
            value: actualData,
            name: '实际营养',
            areaStyle: {
              color: 'rgba(22, 93, 255, 0.3)',
            },
            lineStyle: {
              color: '#165DFF',
              width: 2,
            },
            itemStyle: {
              color: '#165DFF',
            },
          },
          ...(target
            ? [
                {
                  value: targetData,
                  name: '目标值',
                  areaStyle: {
                    color: 'rgba(0, 180, 42, 0.1)',
                  },
                  lineStyle: {
                    color: '#00B42A',
                    width: 2,
                    type: 'dashed',
                  },
                  itemStyle: {
                    color: '#00B42A',
                  },
                },
              ]
            : []),
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} />;
};
