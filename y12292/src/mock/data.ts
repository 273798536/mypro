import type { FloorData, BeaconData, TrajectoryPoint, DeviceLog, Problem, HeatmapCell } from '../types';
const baseTime = Date.now() - 3600000;

export const mockFloors: FloorData[] = [
  { id: 'floor-1', name: '1F 一楼大厅', level: 1, width: 80, height: 60, color: '#1a365d', walls: [
    { start: { x: -40, y: -30 }, end: { x: 40, y: -30 }, height: 3 },
    { start: { x: 40, y: -30 }, end: { x: 40, y: 30 }, height: 3 },
    { start: { x: 40, y: 30 }, end: { x: -40, y: 30 }, height: 3 },
    { start: { x: -40, y: 30 }, end: { x: -40, y: -30 }, height: 3 },
    { start: { x: -10, y: -30 }, end: { x: -10, y: 0 }, height: 3 },
    { start: { x: 10, y: 0 }, end: { x: 10, y: 30 }, height: 3 },
  ]},
  { id: 'floor-2', name: '2F 服饰区', level: 2, width: 80, height: 60, color: '#1e3a5f', walls: [
    { start: { x: -40, y: -30 }, end: { x: 40, y: -30 }, height: 3 },
    { start: { x: 40, y: -30 }, end: { x: 40, y: 30 }, height: 3 },
    { start: { x: 40, y: 30 }, end: { x: -40, y: 30 }, height: 3 },
    { start: { x: -40, y: 30 }, end: { x: -40, y: -30 }, height: 3 },
    { start: { x: 0, y: -10 }, end: { x: 0, y: 10 }, height: 3 },
  ]},
  { id: 'floor-3', name: '3F 餐饮区', level: 3, width: 80, height: 60, color: '#234e7a', walls: [
    { start: { x: -40, y: -30 }, end: { x: 40, y: -30 }, height: 3 },
    { start: { x: 40, y: -30 }, end: { x: 40, y: 30 }, height: 3 },
    { start: { x: 40, y: 30 }, end: { x: -40, y: 30 }, height: 3 },
    { start: { x: -40, y: 30 }, end: { x: -40, y: -30 }, height: 3 },
  ]}
];

export const mockBeacons: BeaconData[] = [
  { id: 'beacon-1-1', mac: 'AA:BB:CC:00:01', name: 'A-101', floorId: 'floor-1', x: -25, y: -15, z: 2.5, signalStrength: -58 },
  { id: 'beacon-1-2', mac: 'AA:BB:CC:00:02', name: 'A-102', floorId: 'floor-1', x: 0, y: -15, z: 2.5, signalStrength: -62 },
  { id: 'beacon-1-3', mac: 'AA:BB:CC:00:03', name: 'A-103', floorId: 'floor-1', x: 25, y: -15, z: 2.5, signalStrength: -55 },
  { id: 'beacon-1-4', mac: 'AA:BB:CC:00:04', name: 'A-104', floorId: 'floor-1', x: -25, y: 15, z: 2.5, signalStrength: -60 },
  { id: 'beacon-1-5', mac: 'AA:BB:CC:00:05', name: 'A-105', floorId: 'floor-1', x: 25, y: 15, z: 2.5, signalStrength: -57 },
  { id: 'beacon-2-1', mac: 'AA:BB:CC:00:06', name: 'B-201', floorId: 'floor-2', x: -25, y: 0, z: 7.5, signalStrength: -65 },
  { id: 'beacon-2-2', mac: 'AA:BB:CC:00:02', name: 'B-202', floorId: 'floor-2', x: 0, y: 0, z: 7.5, signalStrength: -63 },
  { id: 'beacon-2-3', mac: 'AA:BB:CC:00:08', name: 'B-203', floorId: 'floor-2', x: 25, y: 0, z: 7.5, signalStrength: -59 },
  { id: 'beacon-3-1', mac: 'AA:BB:CC:00:09', name: 'C-301', floorId: 'floor-3', x: -20, y: 0, z: 12.5, signalStrength: -61 },
  { id: 'beacon-3-2', mac: 'AA:BB:CC:00:10', name: 'C-302', floorId: 'floor-3', x: 20, y: 0, z: 12.5, signalStrength: -58 },
];

function generateTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const path = [
    { floor: 'floor-1', x: -30, y: -20 },
    { floor: 'floor-1', x: -15, y: -15 },
    { floor: 'floor-1', x: 0, y: -10 },
    { floor: 'floor-1', x: 15, y: -5 },
    { floor: 'floor-2', x: 20, y: 0 },
    { floor: 'floor-2', x: 15, y: 10 },
    { floor: 'floor-3', x: 0, y: 15 },
    { floor: 'floor-3', x: -15, y: 10 },
    { floor: 'floor-3', x: -25, y: 5 },
    { floor: 'floor-3', x: -30, y: 0 },
  ];
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const floorHeight = p.floor === 'floor-1' ? 1.5 : p.floor === 'floor-2' ? 6.5 : 11.5;
    const floorNum = p.floor === 'floor-1' ? '1' : p.floor === 'floor-2' ? '2' : '3';
    points.push({
      id: 'traj-' + i,
      timestamp: baseTime + i * 3000,
      floorId: p.floor,
      x: p.x + (Math.random() - 0.5) * 2,
      y: p.y + (Math.random() - 0.5) * 2,
      z: floorHeight,
      signalStrength: -55 - Math.random() * 20,
      connectedBeacon: 'beacon-' + floorNum + '-' + (Math.floor(Math.random() * 3) + 1)
    });
  }
  points.push({
    id: 'traj-drift',
    timestamp: baseTime + 5 * 3000 + 1500,
    floorId: 'floor-2',
    x: 50,
    y: 25,
    z: 6.5,
    signalStrength: -70,
    connectedBeacon: 'beacon-2-2'
  });
  return points;
}

export const mockTrajectories: TrajectoryPoint[] = generateTrajectory();

export const mockLogs: DeviceLog[] = [
  { id: 'log-1', timestamp: baseTime, beaconId: 'beacon-1-1', eventType: 'CONNECT', message: '设备连接成功' },
  { id: 'log-2', timestamp: baseTime + 5000, beaconId: 'beacon-1-2', eventType: 'SIGNAL_WEAK', message: '信号强度低于阈值' },
  { id: 'log-3', timestamp: baseTime + 10000, beaconId: 'beacon-1-3', eventType: 'CONNECT', message: '设备连接成功' },
  { id: 'log-4', timestamp: baseTime + 15000, beaconId: 'beacon-2-1', eventType: 'CONNECT', message: '设备连接成功' },
  { id: 'log-5', timestamp: baseTime + 20000, beaconId: 'beacon-3-1', eventType: 'INTERFERENCE', message: '检测到信号干扰' },
];

export const mockProblems: Problem[] = [
  {
    id: 'problem-1',
    type: 'floor_jump',
    severity: 'high',
    title: '楼层串跳',
    description: '定位点在短时间内从1楼跳转到2楼',
    humanReadable: '定位设备在3秒内从1楼跳到了2楼，这在物理上是不可能的，正常坐电梯至少需要10秒。这通常是因为不同楼层的信标信号相互干扰导致的。建议检查信标发射功率，适当降低功率减少跨层干扰。',
    position: { x: 20, y: 0, z: 4, floorId: 'floor-1' },
    evidence: ['时间点: 12:00:15', '从1楼跳转到2楼', '间隔时间: 3秒'],
    timestamp: baseTime + 12000
  },
  {
    id: 'problem-2',
    type: 'duplicate_beacon',
    severity: 'high',
    title: '信标重号',
    description: '同一MAC地址出现在多个楼层',
    humanReadable: '编号为 A-102 的信标在1楼和2楼都检测到了。这会导致定位系统无法判断设备真实在哪个楼层，是造成楼层串跳的主要原因之一。请检查现场设备配置，确保每个物理设备只有唯一的MAC地址。',
    position: { x: 0, y: 0, z: 5, floorId: 'floor-2' },
    evidence: ['MAC地址: AA:BB:CC:00:02', '出现楼层: 1楼, 2楼'],
    timestamp: baseTime
  },
  {
    id: 'problem-3',
    type: 'trajectory_drift',
    severity: 'high',
    title: '轨迹漂移',
    description: '轨迹点移动速度异常',
    humanReadable: '轨迹在这个点突然跳了35米远，计算下来的移动速度达到了每秒11.7米，这比百米赛跑的世界纪录还快。显然是定位信号受到了干扰，可能是附近有金属物体反射或者其他无线设备干扰了蓝牙信号。',
    position: { x: 50, y: 25, z: 6.5, floorId: 'floor-2' },
    evidence: ['漂移距离: 35米', '计算速度: 11.7m/s'],
    timestamp: baseTime + 16500
  }
];

export function generateHeatmapData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const floors = ['floor-1', 'floor-2', 'floor-3'];
  floors.forEach(floorId => {
    for (let x = -35; x <= 35; x += 5) {
      for (let y = -25; y <= 25; y += 5) {
        const distFromCenter = Math.sqrt(x * x + y * y);
        const baseValue = 100 - distFromCenter * 1.5;
        cells.push({
          x,
          y,
          value: Math.max(20, baseValue + (Math.random() - 0.5) * 30),
          floorId
        });
      }
    }
  });
  return cells;
}

export const mockHeatmap: HeatmapCell[] = generateHeatmapData();
