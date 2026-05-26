import type { WeatherCondition } from '@/types';

export interface WeatherInfo {
  condition: WeatherCondition;
  name: string;
  icon: string;
  speedModifier: number;
  visibility: number;
  description: string;
}

export const weatherData: WeatherInfo[] = [
  {
    condition: 'sunny',
    name: '晴朗',
    icon: 'sun',
    speedModifier: 1.0,
    visibility: 100,
    description: '视野良好，救援速度正常',
  },
  {
    condition: 'cloudy',
    name: '多云',
    icon: 'cloud',
    speedModifier: 0.95,
    visibility: 90,
    description: '云层较厚，视野略有影响',
  },
  {
    condition: 'light-snow',
    name: '小雪',
    icon: 'cloud-snow',
    speedModifier: 0.85,
    visibility: 70,
    description: '轻度降雪，需减慢速度',
  },
  {
    condition: 'heavy-snow',
    name: '大雪',
    icon: 'snowflake',
    speedModifier: 0.7,
    visibility: 50,
    description: '大雪天气，视野受限',
  },
  {
    condition: 'blizzard',
    name: '暴风雪',
    icon: 'wind',
    speedModifier: 0.5,
    visibility: 25,
    description: '暴风雪警报，极端危险',
  },
];

export const getWeatherInfo = (condition: WeatherCondition): WeatherInfo | undefined => {
  return weatherData.find(w => w.condition === condition);
};

export const getWeatherName = (condition: WeatherCondition): string => {
  return getWeatherInfo(condition)?.name || condition;
};
