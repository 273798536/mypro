import { Vehicle } from '../types';

export const vehicles: Vehicle[] = [
  {
    id: 'car',
    name: '小轿车',
    weight: 15,
    speed: 2,
    width: 60,
    wheels: [
      { x: -20, radius: 12 },
      { x: 20, radius: 12 }
    ],
    color: '#ef4444'
  },
  {
    id: 'truck',
    name: '卡车',
    weight: 40,
    speed: 1.5,
    width: 100,
    wheels: [
      { x: -35, radius: 16 },
      { x: 35, radius: 16 }
    ],
    color: '#3b82f6'
  },
  {
    id: 'bus',
    name: '公交车',
    weight: 55,
    speed: 1.2,
    width: 140,
    wheels: [
      { x: -50, radius: 18 },
      { x: 50, radius: 18 }
    ],
    color: '#eab308'
  },
  {
    id: 'tank',
    name: '重型坦克',
    weight: 120,
    speed: 0.8,
    width: 120,
    wheels: [
      { x: -40, radius: 20 },
      { x: 0, radius: 20 },
      { x: 40, radius: 20 }
    ],
    color: '#166534'
  }
];
