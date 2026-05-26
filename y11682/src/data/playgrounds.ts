import { Playground } from '../types';

export const mockPlaygrounds: Playground[] = [
  {
    id: 'p1',
    name: '儿童活动场A区',
    type: 'children',
    boundary: [
      [-15, -10],
      [-5, -10],
      [-5, 0],
      [-15, 0]
    ],
    requiredSunlight: 180,
    color: '#FF6B6B'
  },
  {
    id: 'p2',
    name: '儿童活动场B区',
    type: 'children',
    boundary: [
      [5, 10],
      [20, 10],
      [20, 20],
      [5, 20]
    ],
    requiredSunlight: 180,
    color: '#FF8E8E'
  },
  {
    id: 'p3',
    name: '健身活动区',
    type: 'fitness',
    boundary: [
      [-40, 5],
      [-28, 5],
      [-28, 15],
      [-40, 15]
    ],
    requiredSunlight: 120,
    color: '#4ECDC4'
  },
  {
    id: 'p4',
    name: '休憩花园',
    type: 'rest',
    boundary: [
      [25, -5],
      [40, -5],
      [40, 8],
      [25, 8]
    ],
    requiredSunlight: 90,
    color: '#95E1D3'
  }
];
