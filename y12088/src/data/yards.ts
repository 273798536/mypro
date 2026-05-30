import { Yard } from '../types';

export const yards: Yard[] = [
  {
    id: 'yard-a',
    name: 'A区堆场',
    width: 80,
    depth: 60,
    blocks: [
      {
        id: 'block-1',
        name: '1号箱区',
        position: { x: -25, z: -15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c1', position: { x: -28, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c2', position: { x: -28, y: 3.75, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c3', position: { x: -24, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c4', position: { x: -24, y: 3.75, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c5', position: { x: -28, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
          { id: 'c6', position: { x: -24, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
          { id: 'c7', position: { x: -24, y: 3.75, z: -12 }, height: 2.5, status: 'overheight' },
        ],
      },
      {
        id: 'block-2',
        name: '2号箱区',
        position: { x: 0, z: -15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c8', position: { x: -3, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c9', position: { x: -3, y: 3.75, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c10', position: { x: 1, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c11', position: { x: 1, y: 3.75, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c12', position: { x: 1, y: 6.25, z: -18 }, height: 2.5, status: 'warning' },
          { id: 'c13', position: { x: -3, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
          { id: 'c14', position: { x: 1, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
        ],
      },
      {
        id: 'block-3',
        name: '3号箱区',
        position: { x: 25, z: -15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c15', position: { x: 22, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c16', position: { x: 22, y: 3.75, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c17', position: { x: 26, y: 1.25, z: -18 }, height: 2.5, status: 'normal' },
          { id: 'c18', position: { x: 22, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
          { id: 'c19', position: { x: 26, y: 1.25, z: -12 }, height: 2.5, status: 'normal' },
        ],
      },
      {
        id: 'block-4',
        name: '4号箱区',
        position: { x: -25, z: 15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c20', position: { x: -28, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c21', position: { x: -28, y: 3.75, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c22', position: { x: -24, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c23', position: { x: -28, y: 1.25, z: 18 }, height: 2.5, status: 'normal' },
          { id: 'c24', position: { x: -24, y: 1.25, z: 18 }, height: 2.5, status: 'normal' },
        ],
      },
      {
        id: 'block-5',
        name: '5号箱区',
        position: { x: 0, z: 15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c25', position: { x: -3, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c26', position: { x: -3, y: 3.75, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c27', position: { x: 1, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c28', position: { x: -3, y: 1.25, z: 18 }, height: 2.5, status: 'normal' },
          { id: 'c29', position: { x: 1, y: 1.25, z: 18 }, height: 2.5, status: 'overheight' },
        ],
      },
      {
        id: 'block-6',
        name: '6号箱区',
        position: { x: 25, z: 15 },
        size: { width: 20, depth: 15 },
        containers: [
          { id: 'c30', position: { x: 22, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c31', position: { x: 26, y: 1.25, z: 12 }, height: 2.5, status: 'normal' },
          { id: 'c32', position: { x: 22, y: 1.25, z: 18 }, height: 2.5, status: 'normal' },
          { id: 'c33', position: { x: 26, y: 1.25, z: 18 }, height: 2.5, status: 'normal' },
        ],
      },
    ],
  },
  {
    id: 'yard-b',
    name: 'B区堆场',
    width: 60,
    depth: 50,
    blocks: [
      {
        id: 'block-b1',
        name: 'B1箱区',
        position: { x: -15, z: -10 },
        size: { width: 15, depth: 12 },
        containers: [
          { id: 'cb1', position: { x: -18, y: 1.25, z: -13 }, height: 2.5, status: 'normal' },
          { id: 'cb2', position: { x: -14, y: 1.25, z: -13 }, height: 2.5, status: 'normal' },
          { id: 'cb3', position: { x: -18, y: 1.25, z: -7 }, height: 2.5, status: 'normal' },
        ],
      },
      {
        id: 'block-b2',
        name: 'B2箱区',
        position: { x: 15, z: -10 },
        size: { width: 15, depth: 12 },
        containers: [
          { id: 'cb4', position: { x: 12, y: 1.25, z: -13 }, height: 2.5, status: 'normal' },
          { id: 'cb5', position: { x: 16, y: 1.25, z: -13 }, height: 2.5, status: 'warning' },
          { id: 'cb6', position: { x: 12, y: 1.25, z: -7 }, height: 2.5, status: 'normal' },
        ],
      },
    ],
  },
];
