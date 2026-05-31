import { ExampleGame, Operation, GameState } from '../types';
import { createInitialState } from './initialNodes';

const generateId = () => Math.random().toString(36).substr(2, 9);

const normalOperations: Operation[] = [
  {
    id: generateId(),
    stepNumber: 1,
    type: 'place_power',
    source: '工具箱: 电源站',
    judgment: '变电站A是核心节点，适合放置电源',
    result: '电源站已放置在变电站A',
    timestamp: Date.now() + 1000,
    nodeIds: ['A'],
  },
  {
    id: generateId(),
    stepNumber: 2,
    type: 'place_wire',
    source: '节点A已通电',
    judgment: 'A→B是串联路径，应该先连接',
    result: '导线A-B已连接，B获得电力',
    timestamp: Date.now() + 2000,
    nodeIds: ['A', 'B'],
    wireId: 'wire-1',
  },
  {
    id: generateId(),
    stepNumber: 3,
    type: 'place_wire',
    source: '节点B已通电',
    judgment: 'B→C继续串联，供电给用户区C',
    result: '导线B-C已连接，C获得电力',
    timestamp: Date.now() + 3000,
    nodeIds: ['B', 'C'],
    wireId: 'wire-2',
  },
  {
    id: generateId(),
    stepNumber: 4,
    type: 'place_power',
    source: '工具箱: 电源站',
    judgment: '为了提高可靠性，在D处增加备用电源',
    result: '电源站已放置在变电站D',
    timestamp: Date.now() + 4000,
    nodeIds: ['D'],
  },
  {
    id: generateId(),
    stepNumber: 5,
    type: 'place_wire',
    source: '节点D已通电',
    judgment: 'D→E连接，供电给用户区E',
    result: '导线D-E已连接，E获得电力',
    timestamp: Date.now() + 5000,
    nodeIds: ['D', 'E'],
    wireId: 'wire-3',
  },
  {
    id: generateId(),
    stepNumber: 6,
    type: 'place_wire',
    source: '两条独立线路已建立',
    judgment: 'E→C形成并联，提高整体可靠性',
    result: '导线E-C已连接，形成并联电路，F获得电力',
    timestamp: Date.now() + 6000,
    nodeIds: ['E', 'C'],
    wireId: 'wire-4',
    isTriggerPoint: true,
  },
];

const blockageOperations: Operation[] = [
  {
    id: generateId(),
    stepNumber: 1,
    type: 'place_power',
    source: '工具箱: 电源站',
    judgment: '变电站A是核心节点，适合放置电源',
    result: '电源站已放置在变电站A',
    timestamp: Date.now() + 1000,
    nodeIds: ['A'],
  },
  {
    id: generateId(),
    stepNumber: 2,
    type: 'place_wire',
    source: '节点A已通电',
    judgment: 'A→B是串联路径，应该先连接',
    result: '导线A-B已连接，B获得电力',
    timestamp: Date.now() + 2000,
    nodeIds: ['A', 'B'],
    wireId: 'wire-1',
  },
  {
    id: generateId(),
    stepNumber: 3,
    type: 'place_wire',
    source: '节点B已通电',
    judgment: 'B→C继续串联',
    result: '导线B-C已连接，C获得电力',
    timestamp: Date.now() + 3000,
    nodeIds: ['B', 'C'],
    wireId: 'wire-2',
  },
  {
    id: generateId(),
    stepNumber: 4,
    type: 'place_wire',
    source: '节点C已通电',
    judgment: 'C→B形成回路？这可能有问题',
    result: '导线C-B已连接，形成闭环！检测到路径堵塞',
    timestamp: Date.now() + 4000,
    nodeIds: ['C', 'B'],
    wireId: 'wire-3',
    isTriggerPoint: true,
  },
  {
    id: generateId(),
    stepNumber: 5,
    type: 'place_wire',
    source: '尝试继续连接',
    judgment: 'C→D应该能供电',
    result: '导线C-D连接失败，路径堵塞导致电力无法流通',
    timestamp: Date.now() + 5000,
    nodeIds: ['C', 'D'],
    wireId: 'wire-4',
  },
];

export const normalExample: ExampleGame = {
  id: 'example-normal',
  title: '正常流程：串并联完美配合',
  description: '展示如何通过串联和并联的配合，安全高效地恢复全城供电。',
  type: 'normal',
  initialState: {
    nodes: createInitialState(),
    wires: [],
    operations: [],
    anomalies: [],
  },
  operations: normalOperations,
  expectedResult: '所有用户区正常供电，形成A-B-C和D-E-C的并联冗余电路，系统稳定运行。',
  triggerPointStep: 6,
};

export const blockageExample: ExampleGame = {
  id: 'example-blockage',
  title: '路径堵塞：闭环导致的故障',
  description: '展示错误的连线形成闭环如何导致路径堵塞，电力无法正常流通。',
  type: 'blockage',
  initialState: {
    nodes: createInitialState(),
    wires: [],
    operations: [],
    anomalies: [],
  },
  operations: blockageOperations,
  expectedResult: '步骤4形成B-C-B闭环导致路径堵塞，后续连接失败，游戏失败。',
  triggerPointStep: 4,
};

export const exampleGames: ExampleGame[] = [normalExample, blockageExample];

export const getExampleById = (id: string): ExampleGame | undefined => {
  return exampleGames.find(ex => ex.id === id);
};
