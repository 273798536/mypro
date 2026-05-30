import { WindCorridor } from '@/types';

export const mockCorridors: WindCorridor[] = [
  {
    id: 'c-001',
    name: '主风廊-东南向',
    color: '#00d4ff',
    path: [
      [-80, 0.5, 80],
      [-40, 0.5, 40],
      [0, 0.5, 0],
      [40, 0.5, -40],
      [80, 0.5, -80]
    ],
    width: 30,
    highlighted: true,
    description: '城市主导风向通风廊道，夏季主导风方向',
    priority: 'high'
  },
  {
    id: 'c-002',
    name: '次风廊-南北向',
    color: '#00ff88',
    path: [
      [0, 0.5, 100],
      [0, 0.5, 50],
      [0, 0.5, 0],
      [0, 0.5, -50],
      [0, 0.5, -100]
    ],
    width: 25,
    highlighted: false,
    description: '次要通风廊道，连接南北片区',
    priority: 'medium'
  },
  {
    id: 'c-003',
    name: '次风廊-东西向',
    color: '#ffaa00',
    path: [
      [-100, 0.5, 0],
      [-50, 0.5, 0],
      [0, 0.5, 0],
      [50, 0.5, 0],
      [100, 0.5, 0]
    ],
    width: 20,
    highlighted: false,
    description: '东西向次级通风廊道',
    priority: 'medium'
  },
  {
    id: 'c-004',
    name: '滨江风廊',
    color: '#ff6b6b',
    path: [
      [-60, 0.5, 60],
      [-30, 0.5, 30],
      [0, 0.5, 15],
      [30, 0.5, 30],
      [60, 0.5, 60]
    ],
    width: 35,
    highlighted: false,
    description: '沿江滨水区域通风廊道，高优先级',
    priority: 'high'
  }
];
