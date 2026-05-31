
import { FlightRecord, WindZone, Waypoint } from '@/types';
import { generateId } from '@/utils/gameEngine';

export const mockWindZones: WindZone[] = [
  {
    id: 'wind-001',
    x: 400,
    y: 300,
    radius: 120,
    direction: 180,
    speed: 4,
    type: 'headwind',
    color: 'rgba(255, 59, 48, 0.3)'
  },
  {
    id: 'wind-002',
    x: 600,
    y: 150,
    radius: 80,
    direction: 0,
    speed: 3,
    type: 'tailwind',
    color: 'rgba(52, 199, 89, 0.3)'
  },
  {
    id: 'wind-003',
    x: 200,
    y: 450,
    radius: 100,
    direction: 90,
    speed: 2,
    type: 'crosswind',
    color: 'rgba(255, 149, 0, 0.3)'
  }
];

export const mockWaypoints: Waypoint[] = [
  { id: 'wp-001', x: 80, y: 520, name: '起点', type: 'start', order: 0 },
  { id: 'wp-002', x: 200, y: 400, name: '检查点A', type: 'checkpoint', order: 1 },
  { id: 'wp-003', x: 450, y: 250, name: '检查点B', type: 'checkpoint', order: 2 },
  { id: 'wp-004', x: 650, y: 350, name: '检查点C', type: 'checkpoint', order: 3 },
  { id: 'wp-005', x: 720, y: 80, name: '终点', type: 'end', order: 4 }
];

function createEnergyLogs(hasHeadwind: boolean): FlightRecord['energyLogs'] {
  const logs: FlightRecord['energyLogs'] = [];
  let battery = 5870;
  
  for (let i = 0; i < 60; i++) {
    const inHeadwind = hasHeadwind && i >= 20 && i <= 40;
    const windType = inHeadwind ? 'headwind' : (i % 5 === 0 ? 'tailwind' : 'calm');
    const windSpeed = inHeadwind ? 4 : (i % 5 === 0 ? 2 : 0);
    const consumption = inHeadwind ? 216 : (i % 5 === 0 ? 84 : 120);
    
    battery -= consumption / 10;
    
    logs.push({
      timestamp: i,
      battery: Math.max(0, battery),
      consumption,
      windType,
      windSpeed,
      position: { x: 80 + i * 11, y: 520 - i * 7 }
    });
  }
  
  return logs;
}

export const mockFlightRecords: FlightRecord[] = [
  {
    id: 'FL-001',
    droneId: 'drone-001',
    pilotName: '张伟',
    startTime: '2024-05-20 09:15:00',
    endTime: '2024-05-20 09:28:30',
    startBattery: 5870,
    endBattery: 2350,
    waypoints: mockWaypoints,
    energyLogs: createEnergyLogs(false),
    violations: [],
    score: 92,
    status: 'completed',
    createdAt: '2024-05-20 09:30:00',
    updatedAt: '2024-05-20 09:30:00',
    remark: '完美飞行！路径规划合理，顺利避开了逆风区域。',
    hasMissingFields: false,
    missingFields: [],
    isLateEntry: false,
    remarkModified: false,
    remarkHistory: [],
    corrections: []
  },
  {
    id: 'FL-002',
    droneId: 'drone-001',
    pilotName: '李明',
    startTime: '2024-05-21 14:20:00',
    endTime: '2024-05-21 14:35:45',
    startBattery: 5870,
    endBattery: 1280,
    waypoints: [
      mockWaypoints[0],
      { id: 'wp-006', x: 350, y: 320, name: '检查点D', type: 'checkpoint', order: 1 },
      mockWaypoints[4]
    ],
    energyLogs: createEnergyLogs(true),
    violations: [
      {
        id: 'viol-002-001',
        type: 'headwind_ignored',
        description: '逆风暴露时间过长(42%)，未主动规避强逆风区域导致能耗超标45%',
        penalty: 15,
        ruleReference: 'R001',
        timestamp: 1716298500000,
        highlighted: true
      }
    ],
    score: 71,
    status: 'completed',
    createdAt: '2024-05-21 14:40:00',
    updatedAt: '2024-05-21 14:40:00',
    remark: '穿越强逆风区，电量消耗超出预期。',
    hasMissingFields: false,
    missingFields: [],
    isLateEntry: false,
    remarkModified: false,
    remarkHistory: [],
    corrections: []
  },
  {
    id: 'FL-003',
    droneId: 'drone-002',
    pilotName: '',
    startTime: '2024-05-22 10:05:00',
    endTime: '2024-05-22 10:22:15',
    startBattery: 3850,
    endBattery: null,
    waypoints: mockWaypoints.slice(0, 3),
    energyLogs: createEnergyLogs(false).slice(0, 35),
    violations: [
      {
        id: 'viol-003-001',
        type: 'missing_field',
        description: '缺失关键字段：pilotName(飞行员姓名)、endBattery(结束电量)',
        penalty: 5,
        ruleReference: 'R005',
        timestamp: 1716363735000,
        highlighted: false
      }
    ],
    score: 68,
    status: 'completed',
    createdAt: '2024-05-22 10:25:00',
    updatedAt: '2024-05-22 10:25:00',
    remark: '',
    hasMissingFields: true,
    missingFields: ['pilotName', 'endBattery'],
    isLateEntry: false,
    remarkModified: false,
    remarkHistory: [],
    corrections: []
  },
  {
    id: 'FL-004',
    droneId: 'drone-003',
    pilotName: '王芳',
    startTime: '2024-05-18 16:30:00',
    endTime: '2024-05-18 16:48:20',
    startBattery: 9800,
    endBattery: 4120,
    waypoints: mockWaypoints,
    energyLogs: createEnergyLogs(false),
    violations: [
      {
        id: 'viol-004-001',
        type: 'late_entry',
        description: '电池数据晚补36小时，影响数据时效性',
        penalty: 3,
        ruleReference: 'R006',
        timestamp: 1716137300000,
        highlighted: false
      }
    ],
    score: 82,
    status: 'completed',
    createdAt: '2024-05-20 04:30:00',
    updatedAt: '2024-05-20 04:30:00',
    remark: '飞行数据补录',
    hasMissingFields: false,
    missingFields: [],
    isLateEntry: true,
    lateEntryHours: 36,
    remarkModified: false,
    remarkHistory: [],
    corrections: [
      {
        id: 'corr-001',
        flightId: 'FL-004',
        fieldName: 'endBattery',
        oldValue: null,
        newValue: 4120,
        reason: '电池数据补录',
        correctedAt: '2024-05-20 04:30:00',
        affectedDetails: ['score', 'energyEfficiency', 'violations']
      }
    ]
  },
  {
    id: 'FL-005',
    droneId: 'drone-002',
    pilotName: '陈杰',
    startTime: '2024-05-23 11:45:00',
    endTime: '2024-05-23 12:02:10',
    startBattery: 3850,
    endBattery: 1560,
    waypoints: mockWaypoints.slice(0, 4),
    energyLogs: createEnergyLogs(true).slice(0, 45),
    violations: [
      {
        id: 'viol-005-001',
        type: 'headwind_ignored',
        description: '逆风暴露时间过长(38%)，建议调整航线',
        penalty: 15,
        ruleReference: 'R001',
        timestamp: 1716457330000,
        highlighted: true
      },
      {
        id: 'viol-005-002',
        type: 'insufficient_return',
        description: '返航电量安全余量不足，逆风条件下应保持35%以上余量',
        penalty: 20,
        ruleReference: 'R002',
        timestamp: 1716457330000,
        highlighted: false
      }
    ],
    score: 55,
    status: 'completed',
    createdAt: '2024-05-23 12:05:00',
    updatedAt: '2024-05-24 09:15:00',
    remark: '第二次修改：已提交复盘报告',
    hasMissingFields: false,
    missingFields: [],
    isLateEntry: false,
    remarkModified: true,
    remarkHistory: [
      {
        oldRemark: '',
        newRemark: '逆风导致耗电超标',
        modifiedAt: '2024-05-23 13:30:00'
      },
      {
        oldRemark: '逆风导致耗电超标',
        newRemark: '第二次修改：已提交复盘报告',
        modifiedAt: '2024-05-24 09:15:00'
      }
    ],
    corrections: []
  }
];
