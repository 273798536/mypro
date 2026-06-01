import { Rack, AirVent, CableTray, Sensor, Alarm } from '../types';

export const mockRacks: Rack[] = [];
const rackRows = 2;
const racksPerRow = 6;

for (let row = 0; row < rackRows; row++) {
  for (let col = 0; col < racksPerRow; col++) {
    const isWarning = (row === 0 && col === 2) || (row === 1 && col === 4);
    const isCritical = row === 0 && col === 5;
    const baseTemp = 22 + Math.random() * 8;
    
    mockRacks.push({
      id: `rack-${row}-${col}`,
      name: `R${row + 1}-${String(col + 1).padStart(2, '0')}`,
      position: [
        col * 2.5 - (racksPerRow - 1) * 1.25,
        0,
        row * 6 - 3,
      ],
      temperature: isCritical ? 38 : isWarning ? 32 : baseTemp,
      status: isCritical ? 'critical' : isWarning ? 'warning' : 'normal',
      model: 'Dell PowerEdge R750',
      row: row + 1,
      column: col + 1,
    });
  }
}

mockRacks.push({
  id: 'rack-duplicate-1',
  name: 'R1-03',
  position: [8, 0, 3],
  temperature: 26,
  status: 'warning',
  model: 'HP ProLiant DL380',
  row: 3,
  column: 1,
});

export const mockVents: AirVent[] = [
  {
    id: 'vent-1',
    name: 'VENT-A1',
    position: [-5, 3, 0],
    status: 'normal',
    airflow: 85,
    maxAirflow: 100,
  },
  {
    id: 'vent-2',
    name: 'VENT-A2',
    position: [0, 3, 0],
    status: 'warning',
    airflow: 45,
    maxAirflow: 100,
  },
  {
    id: 'vent-3',
    name: 'VENT-A3',
    position: [5, 3, 0],
    status: 'normal',
    airflow: 92,
    maxAirflow: 100,
  },
  {
    id: 'vent-4',
    name: 'VENT-B1',
    position: [-5, 3, -6],
    status: 'normal',
    airflow: 88,
    maxAirflow: 100,
  },
  {
    id: 'vent-5',
    name: 'VENT-B2',
    position: [0, 3, -6],
    status: 'critical',
    airflow: 15,
    maxAirflow: 100,
  },
  {
    id: 'vent-6',
    name: 'VENT-B3',
    position: [5, 3, -6],
    status: 'normal',
    airflow: 90,
    maxAirflow: 100,
  },
];

export const mockTrays: CableTray[] = [
  {
    id: 'tray-1',
    name: 'TRAY-MAIN-01',
    points: [
      [-10, 4.5, 0],
      [10, 4.5, 0],
    ],
    status: 'normal',
    cableCount: 48,
  },
  {
    id: 'tray-2',
    name: 'TRAY-ROW-A',
    points: [
      [-6, 4.2, 3],
      [6, 4.2, 3],
    ],
    status: 'normal',
    cableCount: 32,
  },
  {
    id: 'tray-3',
    name: 'TRAY-ROW-B',
    points: [
      [-6, 4.2, -9],
      [6, 4.2, -9],
    ],
    status: 'warning',
    cableCount: 56,
  },
];

export const mockSensors: Sensor[] = mockRacks.flatMap((rack) => {
  const sensors: Sensor[] = [];
  const sensorCount = rack.status === 'critical' ? 1 : rack.status === 'warning' ? 1 : 0;
  
  for (let i = 0; i < 2; i++) {
    const isOffline = i < sensorCount;
    sensors.push({
      id: `sensor-${rack.id}-${i}`,
      rackId: rack.id,
      type: i === 0 ? 'temperature' : 'humidity',
      value: isOffline ? 0 : i === 0 ? rack.temperature : 45 + Math.random() * 10,
      status: isOffline ? 'critical' : 'normal',
      lastOnline: isOffline
        ? new Date(Date.now() - Math.random() * 30 * 60 * 1000).toISOString()
        : new Date().toISOString(),
      position: [
        rack.position[0],
        2 + i * 1.5,
        rack.position[2] + 0.3,
      ],
    });
  }
  return sensors;
});

export const mockAlarms: Alarm[] = [
  {
    id: 'alarm-1',
    type: 'sensor_offline',
    level: 'critical',
    message: '温度探头离线超过15分钟',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    sourceMaterial: '2024-Q2 巡检报告-第17页',
    blockPoint: 'R1-06机柜顶部温度传感器通信中断',
    nextStep: '1. 检查传感器供电\n2. 验证网络连接\n3. 重启传感器设备\n4. 记录处理结果',
    relatedObjectId: 'rack-0-5',
    clues: [
      {
        id: 'clue-1-1',
        type: 'rack',
        relatedId: 'rack-0-5',
        description: '所属机柜：R1-06，当前温度38°C',
      },
      {
        id: 'clue-1-2',
        type: 'vent',
        relatedId: 'vent-3',
        description: '关联风口：VENT-A3，气流正常',
      },
      {
        id: 'clue-1-3',
        type: 'tray',
        relatedId: 'tray-2',
        description: '关联桥架：TRAY-ROW-A，线缆运行正常',
      },
    ],
  },
  {
    id: 'alarm-2',
    type: 'vent_blocked',
    level: 'critical',
    message: '空调风口严重遮挡，气流不足',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    sourceMaterial: '空调系统运行日志-20240601',
    blockPoint: 'VENT-B2出风口检测到物理遮挡，气流仅15%',
    nextStep: '1. 立即检查风口前方障碍物\n2. 清理遮挡物\n3. 验证气流恢复\n4. 调整机柜布局避免再次遮挡',
    relatedObjectId: 'vent-5',
    clues: [
      {
        id: 'clue-2-1',
        type: 'vent',
        relatedId: 'vent-5',
        description: '风口：VENT-B2，气流15%（阈值：60%）',
      },
      {
        id: 'clue-2-2',
        type: 'rack',
        relatedId: 'rack-1-2',
        description: '附近机柜：R2-03，温度正在上升',
      },
      {
        id: 'clue-2-3',
        type: 'tray',
        relatedId: 'tray-1',
        description: '上方桥架：TRAY-MAIN-01，无异常',
      },
    ],
  },
  {
    id: 'alarm-3',
    type: 'rack_duplicate',
    level: 'warning',
    message: '机柜编号重复：R1-03',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sourceMaterial: '机柜资产清单-2024版',
    blockPoint: '系统检测到两台机柜使用相同编号R1-03',
    nextStep: '1. 核对两台机柜物理位置\n2. 更新资产清单重新编号\n3. 更新监控系统配置\n4. 通知运维团队更新文档',
    relatedObjectId: 'rack-0-2',
    clues: [
      {
        id: 'clue-3-1',
        type: 'rack',
        relatedId: 'rack-0-2',
        description: '机柜1：R1-03，位置Row1-Col3，型号Dell R750',
      },
      {
        id: 'clue-3-2',
        type: 'rack',
        relatedId: 'rack-duplicate-1',
        description: '机柜2：R1-03，位置Row3-Col1，型号HP DL380',
      },
    ],
  },
  {
    id: 'alarm-4',
    type: 'sensor_offline',
    level: 'warning',
    message: '湿度探头离线超过5分钟',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    sourceMaterial: '传感器监控系统',
    blockPoint: 'R2-05机柜湿度传感器心跳丢失',
    nextStep: '1. 检查传感器连接\n2. 重启传感器服务\n3. 如故障，安排更换',
    relatedObjectId: 'rack-1-4',
    clues: [
      {
        id: 'clue-4-1',
        type: 'rack',
        relatedId: 'rack-1-4',
        description: '所属机柜：R2-05，运行正常',
      },
      {
        id: 'clue-4-2',
        type: 'vent',
        relatedId: 'vent-5',
        description: '关联风口：VENT-B2，告警中',
      },
    ],
  },
  {
    id: 'alarm-5',
    type: 'vent_blocked',
    level: 'warning',
    message: '空调风口气流偏低',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    sourceMaterial: '空调系统运行日志-20240601',
    blockPoint: 'VENT-A2气流45%，低于正常水平',
    nextStep: '1. 检查风口过滤器\n2. 清理进风口\n3. 检查风机转速',
    relatedObjectId: 'vent-2',
    clues: [
      {
        id: 'clue-5-1',
        type: 'vent',
        relatedId: 'vent-2',
        description: '风口：VENT-A2，气流45%',
      },
      {
        id: 'clue-5-2',
        type: 'rack',
        relatedId: 'rack-0-2',
        description: '附近机柜：R1-03，温度正常',
      },
    ],
  },
];
