import { Level } from '../types';

export const levels: Level[] = [
  {
    id: 'level1',
    name: '入门：小溪桥',
    description: '建造一座简单的桥梁，让小轿车安全通过小溪',
    budget: 500,
    span: 300,
    height: 150,
    groundY: 400,
    anchors: [
      { x: 100, y: 350 },
      { x: 500, y: 350 }
    ],
    deckNodes: [
      { x: 100, y: 350 },
      { x: 500, y: 350 }
    ],
    vehicles: ['car'],
    windLoad: 0
  },
  {
    id: 'level2',
    name: '挑战：河谷大桥',
    description: '跨度更大，需要承受卡车的重量',
    budget: 1200,
    span: 500,
    height: 200,
    groundY: 420,
    anchors: [
      { x: 80, y: 380 },
      { x: 720, y: 380 }
    ],
    deckNodes: [
      { x: 80, y: 380 },
      { x: 720, y: 380 }
    ],
    vehicles: ['car', 'truck'],
    windLoad: 1
  },
  {
    id: 'level3',
    name: '进阶：高速公路桥',
    description: '需要承受公交车队，注意预算控制',
    budget: 2000,
    span: 600,
    height: 250,
    groundY: 450,
    anchors: [
      { x: 60, y: 400 },
      { x: 860, y: 400 }
    ],
    deckNodes: [
      { x: 60, y: 400 },
      { x: 860, y: 400 }
    ],
    vehicles: ['car', 'bus', 'bus'],
    windLoad: 2
  },
  {
    id: 'level4',
    name: '大师：军事通道',
    description: '重型坦克通过，强风环境，极限挑战',
    budget: 3500,
    span: 700,
    height: 300,
    groundY: 480,
    anchors: [
      { x: 50, y: 420 },
      { x: 950, y: 420 }
    ],
    deckNodes: [
      { x: 50, y: 420 },
      { x: 950, y: 420 }
    ],
    vehicles: ['tank', 'truck'],
    windLoad: 3
  }
];
