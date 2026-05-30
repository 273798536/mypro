import { RoadEdge } from '@/types';

export const mockRoads: RoadEdge[] = [
  {
    id: 'r-001',
    name: '主干道-东西向',
    start: [-100, 0, -15],
    end: [100, 0, -15],
    setbackRequired: 8
  },
  {
    id: 'r-002',
    name: '主干道-南北向',
    start: [-15, 0, -100],
    end: [-15, 0, 100],
    setbackRequired: 8
  },
  {
    id: 'r-003',
    name: '次干道-中央大道',
    start: [-100, 0, 15],
    end: [100, 0, 15],
    setbackRequired: 5
  },
  {
    id: 'r-004',
    name: '次干道-东侧路',
    start: [15, 0, -100],
    end: [15, 0, 100],
    setbackRequired: 5
  }
];
