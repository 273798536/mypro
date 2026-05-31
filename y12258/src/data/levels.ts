import { LevelConfig } from '../types/bridge';

export const levels: LevelConfig[] = [
  {
    id: 'level_1',
    name: '入门训练',
    description: '学习基本的桥梁搭建，抵御初级风载',
    difficulty: 1,
    totalBudget: 8000,
    targetWindLevel: 5,
    initialNodes: [
      { id: 'n1', x: 100, y: 300, fixed: true, mass: 100 },
      { id: 'n2', x: 300, y: 300, fixed: false, mass: 80 },
      { id: 'n3', x: 500, y: 300, fixed: false, mass: 80 },
      { id: 'n4', x: 700, y: 300, fixed: true, mass: 100 },
    ],
    initialMembers: [
      { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', type: 'beam', stiffness: 5000, damping: 50, maxStress: 1000, cost: 500 },
      { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', type: 'beam', stiffness: 5000, damping: 50, maxStress: 1000, cost: 500 },
      { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', type: 'beam', stiffness: 5000, damping: 50, maxStress: 1000, cost: 500 },
    ]
  },
  {
    id: 'level_2',
    name: '共振挑战',
    description: '小心！风载频率可能引发共振',
    difficulty: 2,
    totalBudget: 12000,
    targetWindLevel: 8,
    initialNodes: [
      { id: 'n1', x: 80, y: 280, fixed: true, mass: 120 },
      { id: 'n2', x: 250, y: 200, fixed: false, mass: 60 },
      { id: 'n3', x: 420, y: 280, fixed: false, mass: 80 },
      { id: 'n4', x: 590, y: 200, fixed: false, mass: 60 },
      { id: 'n5', x: 760, y: 280, fixed: true, mass: 120 },
    ],
    initialMembers: [
      { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', type: 'beam', stiffness: 6000, damping: 40, maxStress: 1200, cost: 600 },
      { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', type: 'beam', stiffness: 6000, damping: 40, maxStress: 1200, cost: 600 },
      { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', type: 'beam', stiffness: 6000, damping: 40, maxStress: 1200, cost: 600 },
      { id: 'm4', startNodeId: 'n4', endNodeId: 'n5', type: 'beam', stiffness: 6000, damping: 40, maxStress: 1200, cost: 600 },
    ]
  },
  {
    id: 'level_3',
    name: '极限考验',
    description: '高强度风载，需要精密的减震设计',
    difficulty: 3,
    totalBudget: 18000,
    targetWindLevel: 12,
    initialNodes: [
      { id: 'n1', x: 60, y: 320, fixed: true, mass: 150 },
      { id: 'n2', x: 200, y: 220, fixed: false, mass: 70 },
      { id: 'n3', x: 340, y: 320, fixed: false, mass: 90 },
      { id: 'n4', x: 480, y: 180, fixed: false, mass: 50 },
      { id: 'n5', x: 620, y: 320, fixed: false, mass: 90 },
      { id: 'n6', x: 760, y: 220, fixed: false, mass: 70 },
      { id: 'n7', x: 900, y: 320, fixed: true, mass: 150 },
    ],
    initialMembers: [
      { id: 'm1', startNodeId: 'n1', endNodeId: 'n2', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
      { id: 'm2', startNodeId: 'n2', endNodeId: 'n3', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
      { id: 'm3', startNodeId: 'n3', endNodeId: 'n4', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
      { id: 'm4', startNodeId: 'n4', endNodeId: 'n5', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
      { id: 'm5', startNodeId: 'n5', endNodeId: 'n6', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
      { id: 'm6', startNodeId: 'n6', endNodeId: 'n7', type: 'beam', stiffness: 7000, damping: 30, maxStress: 1500, cost: 700 },
    ]
  }
];
