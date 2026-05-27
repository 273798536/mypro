import { StormCloud } from '../types';

export const storms: StormCloud[] = [
  {
    id: 'storm-001',
    name: '华东雷暴云团#01',
    centerLat: 32.5,
    centerLng: 118.0,
    radius: 120,
    topAlt: 12000,
    bottomAlt: 500,
    intensity: 'severe',
    forecastTime: '2026-05-27 14:00:00',
    dataSource: '中国气象局气象卫星数据',
  },
  {
    id: 'storm-002',
    name: '华北雷暴云团#02',
    centerLat: 37.0,
    centerLng: 116.5,
    radius: 80,
    topAlt: 10000,
    bottomAlt: 800,
    intensity: 'moderate',
    forecastTime: '2026-05-27 14:00:00',
    dataSource: '中国气象局气象卫星数据',
  },
  {
    id: 'storm-003',
    name: '华南雷暴云团#03',
    centerLat: 25.5,
    centerLng: 112.0,
    radius: 150,
    topAlt: 13000,
    bottomAlt: 300,
    intensity: 'severe',
    forecastTime: '2026-05-27 14:00:00',
    dataSource: '中国气象局气象卫星数据',
  },
  {
    id: 'storm-004',
    name: '华东雷暴云团#04',
    centerLat: 30.0,
    centerLng: 119.5,
    radius: 60,
    topAlt: 9000,
    bottomAlt: 1000,
    intensity: 'light',
    forecastTime: '2026-05-27 14:00:00',
    dataSource: '中国气象局气象卫星数据',
  },
];

export const getStormById = (id: string): StormCloud | undefined => {
  return storms.find(storm => storm.id === id);
};
