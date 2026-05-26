import { Building } from '../types';

export const mockBuildings: Building[] = [
  {
    id: 'b1',
    name: '1号楼',
    height: 54,
    position: [-30, 0, -20],
    dimensions: [20, 54, 15],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 2,
    color: '#4A5568'
  },
  {
    id: 'b2',
    name: '2号楼',
    height: 66,
    position: [0, 0, -25],
    dimensions: [18, 66, 14],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 3,
    color: '#2D3748'
  },
  {
    id: 'b3',
    name: '3号楼',
    height: 72,
    position: [35, 0, -15],
    dimensions: [22, 72, 16],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 4,
    color: '#1A202C'
  },
  {
    id: 'b4',
    name: '4号楼',
    height: 48,
    position: [-25, 0, 25],
    dimensions: [16, 48, 12],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 5,
    color: '#718096'
  },
  {
    id: 'b5',
    name: '5号楼',
    height: 60,
    position: [15, 0, 30],
    dimensions: [20, 60, 15],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 6,
    color: '#4A5568'
  },
  {
    id: 'b6',
    name: '6号楼',
    height: 58,
    position: [45, 0, 20],
    dimensions: [18, 58, 14],
    source: '楼栋模型数据_2024.xlsx',
    sourceLine: 7,
    color: '#2D3748'
  }
];
