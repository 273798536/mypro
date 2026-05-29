import type { WeatherCard } from '../types';

export const weatherCards: WeatherCard[] = [
  {
    id: 'weather-rain',
    name: '暴雨预警',
    triggerAfterCount: 3,
    description: '暴雨来袭！小舞台设备暂停使用30分钟，观众热度下降',
    effects: [
      {
        type: 'stage_disable',
        target: 'stage-small',
        value: 30,
        description: '小舞台设备暂停使用30分钟',
      },
      {
        type: 'heat_modifier',
        value: -20,
        description: '观众热度-20%',
      },
    ],
    activated: false,
  },
  {
    id: 'weather-heat',
    name: '高温橙色',
    triggerAfterCount: 5,
    description: '高温来袭！观众热情高涨，但艺人需要缩短演出',
    effects: [
      {
        type: 'heat_modifier',
        value: 15,
        description: '观众热度+15%',
      },
      {
        type: 'duration_modifier',
        value: -10,
        description: '演出超60分钟的艺人需减10分钟',
      },
    ],
    activated: false,
  },
  {
    id: 'weather-wind',
    name: '大风蓝色',
    triggerAfterCount: 4,
    description: '大风预警！烟火装置禁用，LED屏需加固',
    effects: [
      {
        type: 'equipment_disable',
        target: '烟火装置',
        value: 0,
        description: '烟火装置禁用',
      },
      {
        type: 'changeover_modifier',
        target: 'LED屏',
        value: 5,
        description: '使用LED屏的舞台换场+5分钟',
      },
    ],
    activated: false,
  },
  {
    id: 'weather-sunny',
    name: '天晴好日',
    triggerAfterCount: 6,
    description: '天气晴好！换场效率提升，观众热度增加',
    effects: [
      {
        type: 'changeover_modifier',
        value: -5,
        description: '所有舞台换场-5分钟',
      },
      {
        type: 'heat_modifier',
        value: 10,
        description: '观众热度+10%',
      },
    ],
    activated: false,
  },
];
