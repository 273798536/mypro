import { Crane } from '../types';

export const cranes: Crane[] = [
  {
    id: 'crane-1',
    name: '1号吊机',
    position: { x: -35, y: 0, z: 0 },
    radius: 30,
    maxHeight: 12,
    blindAreas: [
      {
        id: 'blind-1',
        position: { x: -15, z: -20 },
        radius: 5,
        status: 'pending',
      },
      {
        id: 'blind-2',
        position: { x: -20, z: 20 },
        radius: 4,
        status: 'confirmed',
        assignee: '张工',
      },
    ],
  },
  {
    id: 'crane-2',
    name: '2号吊机',
    position: { x: 0, y: 0, z: 0 },
    radius: 35,
    maxHeight: 15,
    blindAreas: [
      {
        id: 'blind-3',
        position: { x: 15, z: 0 },
        radius: 6,
        status: 'pending',
      },
    ],
  },
  {
    id: 'crane-3',
    name: '3号吊机',
    position: { x: 35, y: 0, z: 0 },
    radius: 28,
    maxHeight: 12,
    blindAreas: [],
  },
];
