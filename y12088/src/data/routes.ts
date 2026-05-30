import { TruckRoute } from '../types';

export const truckRoutes: TruckRoute[] = [
  {
    id: 'route-1',
    truckId: 'truck-001',
    color: '#165DFF',
    points: [
      { x: -40, z: -30, time: 0 },
      { x: -30, z: -25, time: 10 },
      { x: -20, z: -25, time: 20 },
      { x: -10, z: -25, time: 30 },
      { x: 0, z: -25, time: 40 },
      { x: 10, z: -25, time: 50 },
      { x: 20, z: -25, time: 60 },
      { x: 30, z: -25, time: 70 },
      { x: 40, z: -30, time: 80 },
    ],
  },
  {
    id: 'route-2',
    truckId: 'truck-002',
    color: '#FF7D00',
    points: [
      { x: 40, z: 30, time: 0 },
      { x: 30, z: 25, time: 15 },
      { x: 20, z: 25, time: 25 },
      { x: 10, z: 25, time: 35 },
      { x: 0, z: 25, time: 45 },
      { x: -10, z: 25, time: 55 },
      { x: -20, z: 25, time: 65 },
      { x: -30, z: 25, time: 75 },
      { x: -40, z: 30, time: 90 },
    ],
  },
  {
    id: 'route-3',
    truckId: 'truck-003',
    color: '#00B42A',
    points: [
      { x: -45, z: 0, time: 5 },
      { x: -35, z: 0, time: 15 },
      { x: -25, z: 0, time: 25 },
      { x: -15, z: 0, time: 35 },
      { x: -5, z: 0, time: 45 },
      { x: 5, z: 0, time: 55 },
      { x: 15, z: 0, time: 65 },
      { x: 25, z: 0, time: 75 },
      { x: 35, z: 0, time: 85 },
      { x: 45, z: 0, time: 95 },
    ],
  },
];
