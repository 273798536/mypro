import { NoFlyZone } from '../types';

export const noFlyZones: NoFlyZone[] = [
  {
    id: 'nfz-001',
    name: '北京首都机场限制区',
    type: 'restricted',
    polygon: [
      { lat: 40.2, lng: 116.4 },
      { lat: 40.2, lng: 116.8 },
      { lat: 39.9, lng: 116.8 },
      { lat: 39.9, lng: 116.4 },
    ],
    minAlt: 0,
    maxAlt: 6000,
    effectiveFrom: '2026-01-01 00:00:00',
    effectiveTo: '2026-12-31 23:59:59',
    dataSource: '中国民用航空局空域管理规定',
  },
  {
    id: 'nfz-002',
    name: '南京军事训练区',
    type: 'danger',
    polygon: [
      { lat: 32.2, lng: 118.5 },
      { lat: 32.2, lng: 119.2 },
      { lat: 31.6, lng: 119.2 },
      { lat: 31.6, lng: 118.5 },
    ],
    minAlt: 0,
    maxAlt: 8000,
    effectiveFrom: '2026-05-20 00:00:00',
    effectiveTo: '2026-06-10 23:59:59',
    dataSource: '中国人民解放军空军公告',
  },
  {
    id: 'nfz-003',
    name: '上海虹桥机场保护区',
    type: 'prohibited',
    polygon: [
      { lat: 31.3, lng: 121.1 },
      { lat: 31.3, lng: 121.5 },
      { lat: 31.0, lng: 121.5 },
      { lat: 31.0, lng: 121.1 },
    ],
    minAlt: 0,
    maxAlt: 4500,
    effectiveFrom: '2026-01-01 00:00:00',
    effectiveTo: '2026-12-31 23:59:59',
    dataSource: '中国民用航空局空域管理规定',
  },
];

export const getNoFlyZoneById = (id: string): NoFlyZone | undefined => {
  return noFlyZones.find(zone => zone.id === id);
};
