import { Level, DeviceType } from '@/types';

export const LEVELS: Level[] = [
  {
    id: 'level-001',
    name: '乐队设备抢修夜 - 经典场',
    version: 'v1.2',
    source: '2024全国巡演·北京站',
    description: '距离开场还有3分钟！请在限定时间内完成设备布置、线缆连接和走位规划。注意：主音箱和调音台是最高优先级，绝对不能出错！',
    timeLimit: 180,
    gridSize: { width: 8, height: 6 },
    requiredDevices: [
      { type: 'speaker' as DeviceType, count: 2 },
      { type: 'mixer' as DeviceType, count: 1 },
      { type: 'mic_stand' as DeviceType, count: 3 },
      { type: 'monitor' as DeviceType, count: 2 },
      { type: 'effect_pedal' as DeviceType, count: 2 },
      { type: 'di_box' as DeviceType, count: 2 }
    ],
    requiredCables: [
      { from: '主音箱L', to: '调音台', label: '主输出L' },
      { from: '主音箱R', to: '调音台', label: '主输出R' },
      { from: '主唱麦', to: '调音台', label: '主唱麦线' },
      { from: '吉他手麦', to: '调音台', label: '吉他麦线' },
      { from: '贝斯手麦', to: '调音台', label: '贝斯麦线' }
    ],
    requiredPaths: [
      { musician: '主唱', count: 1 },
      { musician: '吉他手', count: 1 },
      { musician: '贝斯手', count: 1 }
    ],
    blockedAreas: [
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 3, y: 5 },
      { x: 4, y: 5 }
    ],
    createdAt: '2024-11-15T10:30:00Z',
    updatedAt: '2024-12-20T14:45:00Z'
  }
];

export const DEFAULT_LEVEL = LEVELS[0];
