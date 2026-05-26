import type { SlopeNode } from '@/types';

export const slopeMapData: SlopeNode[] = [
  {
    id: 'base',
    name: '基地站',
    x: 400,
    y: 450,
    difficulty: 'green',
    isOpen: true,
    connectedTo: ['green-1', 'blue-1'],
  },
  {
    id: 'green-1',
    name: '初级道 A',
    x: 300,
    y: 350,
    difficulty: 'green',
    isOpen: true,
    connectedTo: ['base', 'green-2', 'blue-1'],
  },
  {
    id: 'green-2',
    name: '初级道 B',
    x: 200,
    y: 280,
    difficulty: 'green',
    isOpen: true,
    connectedTo: ['green-1', 'green-3'],
  },
  {
    id: 'green-3',
    name: '初级道 C',
    x: 150,
    y: 200,
    difficulty: 'green',
    isOpen: true,
    connectedTo: ['green-2', 'mid-station'],
  },
  {
    id: 'blue-1',
    name: '中级道 A',
    x: 500,
    y: 320,
    difficulty: 'blue',
    isOpen: true,
    connectedTo: ['base', 'green-1', 'blue-2', 'black-1'],
  },
  {
    id: 'blue-2',
    name: '中级道 B',
    x: 550,
    y: 220,
    difficulty: 'blue',
    isOpen: true,
    connectedTo: ['blue-1', 'mid-station', 'black-2'],
  },
  {
    id: 'black-1',
    name: '高级道 A',
    x: 620,
    y: 300,
    difficulty: 'black',
    isOpen: true,
    connectedTo: ['blue-1', 'black-2'],
  },
  {
    id: 'black-2',
    name: '高级道 B',
    x: 650,
    y: 180,
    difficulty: 'black',
    isOpen: true,
    connectedTo: ['black-1', 'blue-2', 'double-black'],
  },
  {
    id: 'double-black',
    name: '专家道',
    x: 600,
    y: 100,
    difficulty: 'double-black',
    isOpen: true,
    connectedTo: ['black-2', 'peak'],
  },
  {
    id: 'mid-station',
    name: '中途站',
    x: 350,
    y: 150,
    difficulty: 'green',
    isOpen: true,
    connectedTo: ['green-3', 'blue-2', 'peak'],
  },
  {
    id: 'peak',
    name: '山顶站',
    x: 450,
    y: 50,
    difficulty: 'blue',
    isOpen: true,
    connectedTo: ['mid-station', 'double-black'],
  },
];

export const getDifficultyColor = (difficulty: string): string => {
  const colors: Record<string, string> = {
    green: '#81C784',
    blue: '#64B5F6',
    black: '#424242',
    'double-black': '#212121',
  };
  return colors[difficulty] || '#9E9E9E';
};

export const getDifficultyLabel = (difficulty: string): string => {
  const labels: Record<string, string> = {
    green: '初级',
    blue: '中级',
    black: '高级',
    'double-black': '专家',
  };
  return labels[difficulty] || '未知';
};
