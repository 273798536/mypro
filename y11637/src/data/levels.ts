import type { Level, Station } from '../types';

const defaultStations: Station[] = [
  { id: 'station-1', name: '站点A', order: 1 },
  { id: 'station-2', name: '站点B', order: 2 },
  { id: 'station-3', name: '站点C', order: 3 },
];

function generateCompartments(rows: number, cols: number): Level['compartments'] {
  const compartments: Level['compartments'] = [];
  const zones: ('frozen' | 'chilled' | 'ambient')[] = ['frozen', 'chilled', 'ambient'];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const zoneIndex = Math.floor(row / Math.ceil(rows / 3));
      compartments.push({
        id: `compartment-${row}-${col}`,
        zone: zones[Math.min(zoneIndex, 2)],
        row,
        col,
        occupiedBy: null,
      });
    }
  }
  return compartments;
}

export const defaultLevels: Level[] = [
  {
    id: 'level-1',
    name: '新手入门',
    difficulty: 'easy',
    timeLimit: 180,
    source: '系统默认',
    version: 1,
    lastModified: Date.now(),
    stations: defaultStations,
    cargoBoxes: [
      { id: 'cargo-1', name: '冰淇淋', zone: 'frozen', weight: 50, destination: 'station-1', priority: 1 },
      { id: 'cargo-2', name: '速冻饺子', zone: 'frozen', weight: 30, destination: 'station-2', priority: 2 },
      { id: 'cargo-3', name: '鲜奶', zone: 'chilled', weight: 40, destination: 'station-1', priority: 1 },
      { id: 'cargo-4', name: '酸奶', zone: 'chilled', weight: 25, destination: 'station-3', priority: 3 },
      { id: 'cargo-5', name: '饼干', zone: 'ambient', weight: 20, destination: 'station-2', priority: 2 },
      { id: 'cargo-6', name: '薯片', zone: 'ambient', weight: 15, destination: 'station-3', priority: 3 },
    ],
    compartments: generateCompartments(3, 2),
  },
  {
    id: 'level-2',
    name: '进阶挑战',
    difficulty: 'medium',
    timeLimit: 240,
    source: '系统默认',
    version: 1,
    lastModified: Date.now(),
    stations: defaultStations,
    cargoBoxes: [
      { id: 'cargo-1', name: '速冻海鲜', zone: 'frozen', weight: 60, destination: 'station-1', priority: 1 },
      { id: 'cargo-2', name: '冰淇淋', zone: 'frozen', weight: 40, destination: 'station-2', priority: 2 },
      { id: 'cargo-3', name: '速冻肉类', zone: 'frozen', weight: 50, destination: 'station-3', priority: 3 },
      { id: 'cargo-4', name: '鲜奶', zone: 'chilled', weight: 45, destination: 'station-1', priority: 1 },
      { id: 'cargo-5', name: '鸡蛋', zone: 'chilled', weight: 30, destination: 'station-2', priority: 2 },
      { id: 'cargo-6', name: '酸奶', zone: 'chilled', weight: 25, destination: 'station-3', priority: 3 },
      { id: 'cargo-7', name: '蔬菜', zone: 'chilled', weight: 35, destination: 'station-1', priority: 1 },
      { id: 'cargo-8', name: '大米', zone: 'ambient', weight: 100, destination: 'station-2', priority: 2 },
      { id: 'cargo-9', name: '食用油', zone: 'ambient', weight: 80, destination: 'station-3', priority: 3 },
    ],
    compartments: generateCompartments(3, 3),
  },
  {
    id: 'level-3',
    name: '大师模式',
    difficulty: 'hard',
    timeLimit: 300,
    source: '系统默认',
    version: 1,
    lastModified: Date.now(),
    stations: defaultStations,
    cargoBoxes: [
      { id: 'cargo-1', name: '速冻海鲜', zone: 'frozen', weight: 60, destination: 'station-1', priority: 1 },
      { id: 'cargo-2', name: '冰淇淋', zone: 'frozen', weight: 40, destination: 'station-2', priority: 2 },
      { id: 'cargo-3', name: '速冻肉类', zone: 'frozen', weight: 50, destination: 'station-3', priority: 3 },
      { id: 'cargo-4', name: '冷冻水饺', zone: 'frozen', weight: 35, destination: 'station-1', priority: 1 },
      { id: 'cargo-5', name: '鲜奶', zone: 'chilled', weight: 45, destination: 'station-1', priority: 1 },
      { id: 'cargo-6', name: '鸡蛋', zone: 'chilled', weight: 30, destination: 'station-2', priority: 2 },
      { id: 'cargo-7', name: '酸奶', zone: 'chilled', weight: 25, destination: 'station-3', priority: 3 },
      { id: 'cargo-8', name: '蔬菜', zone: 'chilled', weight: 35, destination: 'station-1', priority: 1 },
      { id: 'cargo-9', name: '水果', zone: 'chilled', weight: 40, destination: 'station-2', priority: 2 },
      { id: 'cargo-10', name: '大米', zone: 'ambient', weight: 100, destination: 'station-2', priority: 2 },
      { id: 'cargo-11', name: '食用油', zone: 'ambient', weight: 80, destination: 'station-3', priority: 3 },
      { id: 'cargo-12', name: '调味品', zone: 'ambient', weight: 20, destination: 'station-1', priority: 1 },
    ],
    compartments: generateCompartments(3, 4),
  },
];
