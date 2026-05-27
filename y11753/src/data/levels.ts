import { Level, Area } from '../types';

const createMapLayout = (): Area[] => {
  return [
    {
      id: 'area-1',
      name: 'A区光伏阵列',
      type: 'panel',
      position: { x: 50, y: 50 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 85
    },
    {
      id: 'area-2',
      name: 'B区光伏阵列',
      type: 'panel',
      position: { x: 280, y: 50 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 90
    },
    {
      id: 'area-3',
      name: 'C区光伏阵列',
      type: 'panel',
      position: { x: 510, y: 50 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 75
    },
    {
      id: 'area-4',
      name: 'D区光伏阵列',
      type: 'panel',
      position: { x: 50, y: 220 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 80
    },
    {
      id: 'area-5',
      name: 'E区光伏阵列',
      type: 'panel',
      position: { x: 280, y: 220 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 95
    },
    {
      id: 'area-6',
      name: 'F区光伏阵列',
      type: 'panel',
      position: { x: 510, y: 220 },
      size: { width: 180, height: 120 },
      status: 'normal',
      cleanliness: 70
    },
    {
      id: 'inverter-1',
      name: '1号逆变器房',
      type: 'inverter',
      position: { x: 100, y: 390 },
      size: { width: 100, height:  80 },
      status: 'normal',
      cleanliness: 100
    },
    {
      id: 'inverter-2',
      name: '2号逆变器房',
      type: 'inverter',
      position: { x: 320, y: 390 },
      size: { width: 100, height:  80 },
      status: 'normal',
      cleanliness: 100
    },
    {
      id: 'substation',
      name: '变电站',
      type: 'substation',
      position: { x: 540, y: 390 },
      size: { width: 120, height:  80 },
      status: 'normal',
      cleanliness: 100
    }
  ];
};

export const levels: Level[] = [
  {
    id: 'level-1',
    name: '新手训练',
    difficulty: 'easy',
    description: '熟悉基本操作，处理简单故障',
    totalTime: 180,
    initialBattery: 100,
    batteryDecayRate: 0.5,
    faultFrequency: 0.02,
    weatherChangeRate: 0.01,
    mapLayout: createMapLayout(),
    initialFaults: [
      {
        areaId: 'area-1',
        type: 'panel_dirty',
        priority: 'low',
        source: '日常巡检',
        description: 'A区光伏板表面积灰较多'
      },
      {
        areaId: 'area-3',
        type: 'unknown',
        priority: 'medium',
        source: '系统警报',
        description: 'C区传感器异常，需无人机勘察'
      }
    ],
    objectives: [
      { id: 'obj-1', description: '处理所有初始故障', target: 2 },
      { id: 'obj-2', description: '保持电量高于30%', target: 1 },
      { id: 'obj-3', description: '无漏查故障', target: 0 }
    ],
    maxFaults: 5
  },
  {
    id: 'level-2',
    name: '日常运维',
    difficulty: 'medium',
    description: '应对多变天气，管理多种资源',
    totalTime: 300,
    initialBattery: 80,
    batteryDecayRate: 0.8,
    faultFrequency: 0.04,
    weatherChangeRate: 0.02,
    mapLayout: createMapLayout(),
    initialFaults: [
      {
        areaId: 'area-2',
        type: 'panel_dirty',
        priority: 'medium',
        source: '无人机巡检',
        description: 'B区光伏板积灰严重'
      },
      {
        areaId: 'inverter-1',
        type: 'inverter_fault',
        priority: 'high',
        source: '系统警报',
        description: '1号逆变器温度过高'
      },
      {
        areaId: 'area-5',
        type: 'unknown',
        priority: 'low',
        source: '人工报告',
        description: 'E区有不明异常信号'
      }
    ],
    objectives: [
      { id: 'obj-1', description: '处理至少8个故障', target: 8 },
      { id: 'obj-2', description: '资源利用率超过60%', target: 1 },
      { id: 'obj-3', description: '漏查故障不超过2个', target: 2 }
    ],
    maxFaults: 10
  },
  {
    id: 'level-3',
    name: '应急演练',
    difficulty: 'hard',
    description: '恶劣天气下的应急处理，考验决策能力',
    totalTime: 240,
    initialBattery: 60,
    batteryDecayRate: 1.2,
    faultFrequency: 0.06,
    weatherChangeRate: 0.05,
    mapLayout: createMapLayout(),
    initialFaults: [
      {
        areaId: 'area-1',
        type: 'wire_damage',
        priority: 'critical',
        source: '系统警报',
        description: 'A区线路损坏，有起火风险'
      },
      {
        areaId: 'area-4',
        type: 'panel_dirty',
        priority: 'high',
        source: '无人机巡检',
        description: 'D区光伏板严重积灰'
      },
      {
        areaId: 'inverter-2',
        type: 'inverter_fault',
        priority: 'high',
        source: '系统警报',
        description: '2号逆变器异常停机'
      },
      {
        areaId: 'area-6',
        type: 'unknown',
        priority: 'medium',
        source: '传感器',
        description: 'F区传输信号中断'
      }
    ],
    objectives: [
      { id: 'obj-1', description: '处理所有紧急故障', target: 2 },
      { id: 'obj-2', description: '电量不低于20%', target: 1 },
      { id: 'obj-3', description: '故障漏查率低于20%', target: 1 }
    ],
    maxFaults: 15
  }
];

export const getLevelById = (id: string): Level | undefined => {
  return levels.find(level => level.id === id);
};
