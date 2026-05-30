import { NetworkNode, PipeConnection, Resources, GameState } from '../types/game';

export const initialNodes: NetworkNode[] = [
  {
    id: 'ice_mine_1',
    type: 'ice_mine',
    name: '北极冰矿点',
    position: { x: 80, y: 120 },
    status: 'normal',
    health: 85,
    capacity: 100,
    currentLoad: 40,
  },
  {
    id: 'ice_mine_2',
    type: 'ice_mine',
    name: '南极冰矿点',
    position: { x: 80, y: 320 },
    status: 'normal',
    health: 75,
    capacity: 100,
    currentLoad: 35,
  },
  {
    id: 'pump_1',
    type: 'pump',
    name: '主水泵站',
    position: { x: 320, y: 220 },
    status: 'normal',
    health: 90,
    capacity: 200,
    currentLoad: 75,
  },
  {
    id: 'greenhouse',
    type: 'greenhouse',
    name: '生态温室',
    position: { x: 560, y: 100 },
    status: 'normal',
    health: 88,
    capacity: 80,
    currentLoad: 60,
  },
  {
    id: 'recycler',
    type: 'recycler',
    name: '水回收机',
    position: { x: 560, y: 340 },
    status: 'normal',
    health: 70,
    capacity: 120,
    currentLoad: 80,
  },
  {
    id: 'base',
    type: 'base',
    name: '指挥基地',
    position: { x: 720, y: 220 },
    status: 'normal',
    health: 95,
    capacity: 150,
    currentLoad: 100,
  },
];

export const initialPipes: PipeConnection[] = [
  {
    id: 'pipe_1',
    from: 'ice_mine_1',
    to: 'pump_1',
    status: 'connected',
    flowRate: 40,
    maxFlow: 80,
  },
  {
    id: 'pipe_2',
    from: 'ice_mine_2',
    to: 'pump_1',
    status: 'connected',
    flowRate: 35,
    maxFlow: 80,
  },
  {
    id: 'pipe_3',
    from: 'pump_1',
    to: 'greenhouse',
    status: 'connected',
    flowRate: 30,
    maxFlow: 60,
  },
  {
    id: 'pipe_4',
    from: 'pump_1',
    to: 'recycler',
    status: 'connected',
    flowRate: 25,
    maxFlow: 70,
  },
  {
    id: 'pipe_5',
    from: 'greenhouse',
    to: 'base',
    status: 'connected',
    flowRate: 20,
    maxFlow: 50,
  },
  {
    id: 'pipe_6',
    from: 'recycler',
    to: 'base',
    status: 'connected',
    flowRate: 45,
    maxFlow: 80,
  },
];

export const initialResources: Resources = {
  water: 500,
  ice: 300,
  greenhouseHumidity: 75,
  baseUsage: 100,
};

export const getInitialGameState = (): GameState => ({
  currentRound: 1,
  maxRounds: 5,
  isGameOver: false,
  totalScore: 0,
  nodes: JSON.parse(JSON.stringify(initialNodes)),
  pipes: JSON.parse(JSON.stringify(initialPipes)),
  resources: JSON.parse(JSON.stringify(initialResources)),
  roundHistory: [],
  pendingConflicts: [],
  anomalies: [],
  currentActions: [],
  showSettlement: false,
});

export const nodeTypeLabels: Record<string, string> = {
  ice_mine: '冰矿点',
  pump: '水泵站',
  greenhouse: '温室',
  recycler: '回收机',
  base: '基地',
};

export const anomalyTypeLabels: Record<string, string> = {
  pipe_disconnect: '管道断连',
  recycle_overload: '回收过载',
  greenhouse_drought: '温室缺水',
};

export const anomalyExplanations: Record<string, { simple: string; cause: string; fix: string }> = {
  pipe_disconnect: {
    simple: '管道断了，水流不过去',
    cause: '管道健康度太低，或者两头的设备没维护好',
    fix: '下次记得先检查管道连接，给脆弱的管道做维护',
  },
  recycle_overload: {
    simple: '回收机忙不过来了',
    cause: '收的水太多，回收机处理能力跟不上',
    fix: '要么减少回收量，要么升级回收机的处理能力',
  },
  greenhouse_drought: {
    simple: '温室没水了，植物要干死',
    cause: '供水管路断了，或者水泵没送够水',
    fix: '检查通向温室的管道，确保水流畅通',
  },
};
