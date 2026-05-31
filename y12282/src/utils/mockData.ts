import {
  DamModel,
  CrackPoint,
  Sensor,
  SeepageData,
  InspectionNote,
  AnomalyRecord,
  FileInfo,
  HeatMapPoint,
  Vector3,
} from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const mockDamModel: DamModel = {
  id: 'dam-001',
  name: 'XX水库主坝',
  importTime: new Date('2024-01-15'),
  geometry: {
    width: 100,
    height: 40,
    depth: 30,
    upstreamSlope: 2.5,
    downstreamSlope: 2.0,
  },
  sourceFile: {
    id: 'file-001',
    name: 'dam_model_v2.obj',
    type: 'model',
    size: 2048576,
    uploadTime: new Date('2024-01-15'),
    hash: 'a1b2c3d4e5f6',
  },
};

export const mockCrackPoints: CrackPoint[] = [
  {
    id: 'crack-001',
    position: { x: 20, y: 15, z: 0 },
    length: 3.5,
    width: 0.02,
    depth: 0.5,
    description: '上游坝面中部横向裂缝',
    detectionTime: new Date('2024-01-10'),
    isDuplicate: false,
  },
  {
    id: 'crack-002',
    position: { x: 20.5, y: 14.8, z: 0.2 },
    length: 3.2,
    width: 0.015,
    depth: 0.45,
    description: '疑似重复裂缝-与crack-001位置重叠',
    detectionTime: new Date('2024-01-12'),
    isDuplicate: true,
    duplicateOf: 'crack-001',
  },
  {
    id: 'crack-003',
    position: { x: -15, y: 20, z: 0 },
    length: 2.1,
    width: 0.01,
    depth: 0.3,
    description: '下游坝面纵向裂缝',
    detectionTime: new Date('2024-01-08'),
    isDuplicate: false,
  },
  {
    id: 'crack-004',
    position: { x: 0, y: 8, z: 5 },
    length: 1.5,
    width: 0.008,
    depth: 0.2,
    description: '坝顶表面细微裂缝',
    detectionTime: new Date('2024-01-14'),
    isDuplicate: false,
  },
  {
    id: 'crack-005',
    position: { x: 20.3, y: 15.1, z: 0.1 },
    length: 3.4,
    width: 0.018,
    depth: 0.48,
    description: '疑似重复裂缝-第三次上报同一位置',
    detectionTime: new Date('2024-01-13'),
    isDuplicate: true,
    duplicateOf: 'crack-001',
  },
];

export const mockSensors: Sensor[] = [
  {
    id: 'sensor-001',
    name: '渗压计P-01',
    position: { x: 10, y: 5, z: 0 },
    type: 'pressure',
    status: 'online',
    lastUpdate: new Date(),
  },
  {
    id: 'sensor-002',
    name: '渗压计P-02',
    position: { x: -10, y: 5, z: 0 },
    type: 'pressure',
    status: 'offline',
    lastUpdate: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: 'sensor-003',
    name: '水位计W-01',
    position: { x: 30, y: 30, z: 0 },
    type: 'water_level',
    status: 'online',
    lastUpdate: new Date(),
  },
  {
    id: 'sensor-004',
    name: '渗压计P-03',
    position: { x: 0, y: 10, z: 10 },
    type: 'pressure',
    status: 'warning',
    lastUpdate: new Date(Date.now() - 3600000),
  },
];

export const mockSeepageData: SeepageData[] = Array.from({ length: 50 }, (_, i) => ({
  id: `data-${generateId()}`,
  sensorId: mockSensors[i % 4].id,
  timestamp: new Date(Date.now() - (50 - i) * 3600000),
  value: 50 + Math.sin(i * 0.3) * 30 + Math.random() * 20,
  unit: 'kPa',
})).concat([
  {
    id: 'data-spike-001',
    sensorId: 'sensor-003',
    timestamp: new Date(Date.now() - 1800000),
    value: 280,
    unit: 'kPa',
  },
]);

export const mockInspectionNotes: InspectionNote[] = [
  {
    id: 'note-001',
    author: '张工',
    timestamp: new Date('2024-01-12'),
    content: '上游坝面发现裂缝，长度约3.5米，需要持续监测。建议每周巡检一次。',
    relatedCrackIds: ['crack-001'],
  },
  {
    id: 'note-002',
    author: '李工',
    timestamp: new Date('2024-01-13'),
    content: '复查发现疑似同一位置再次上报，请确认是否为重复记录。',
    relatedCrackIds: ['crack-002', 'crack-001'],
  },
  {
    id: 'note-003',
    author: '王工',
    timestamp: new Date('2024-01-08'),
    content: '下游坝面纵向裂缝，目前无明显扩展迹象。',
    relatedCrackIds: ['crack-003'],
  },
];

export const mockAnomalies: AnomalyRecord[] = [
  {
    id: 'anomaly-001',
    type: 'duplicate_crack',
    severity: 'medium',
    timestamp: new Date('2024-01-12'),
    description: '检测到裂缝重复上报：crack-002与crack-001位置重叠（距离0.54m）',
    relatedEntityId: 'crack-002',
    pathHistory: [
      {
        step: 1,
        action: '导入裂缝数据',
        timestamp: new Date('2024-01-12T08:30:00'),
        result: 'success',
        details: '成功导入5条裂缝记录',
      },
      {
        step: 2,
        action: '空间距离计算',
        timestamp: new Date('2024-01-12T08:30:05'),
        result: 'warning',
        details: 'crack-002与crack-001距离小于阈值1m',
      },
      {
        step: 3,
        action: '特征匹配验证',
        timestamp: new Date('2024-01-12T08:30:06'),
        result: 'failure',
        details: '长度、宽度、方向特征匹配度92%',
      },
      {
        step: 4,
        action: '标记为重复',
        timestamp: new Date('2024-01-12T08:30:07'),
        result: 'warning',
        details: '已将crack-002标记为crack-001的重复记录',
      },
    ],
  },
  {
    id: 'anomaly-002',
    type: 'duplicate_crack',
    severity: 'high',
    timestamp: new Date('2024-01-13'),
    description: '检测到多次重复上报：crack-005为第三次重复上报同一位置',
    relatedEntityId: 'crack-005',
    pathHistory: [
      {
        step: 1,
        action: '导入新裂缝数据',
        timestamp: new Date('2024-01-13T10:15:00'),
        result: 'success',
        details: '成功导入1条新裂缝记录',
      },
      {
        step: 2,
        action: '数据库匹配查询',
        timestamp: new Date('2024-01-13T10:15:02'),
        result: 'failure',
        details: '发现2条历史记录位置相近（crack-001, crack-002）',
      },
      {
        step: 3,
        action: '重复验证确认',
        timestamp: new Date('2024-01-13T10:15:03'),
        result: 'failure',
        details: '与crack-001匹配度95%，确认为重复上报',
      },
      {
        step: 4,
        action: '触发多次重复预警',
        timestamp: new Date('2024-01-13T10:15:04'),
        result: 'warning',
        details: '该位置已累计3次上报，请核查数据来源',
      },
    ],
  },
  {
    id: 'anomaly-003',
    type: 'sensor_offline',
    severity: 'high',
    timestamp: new Date(Date.now() - 86400000 * 3),
    description: '传感器P-02已离线超过72小时，最后数据更新于3天前',
    relatedEntityId: 'sensor-002',
    pathHistory: [
      {
        step: 1,
        action: '传感器心跳检测',
        timestamp: new Date(Date.now() - 86400000 * 3),
        result: 'success',
        details: '轮询4个传感器状态',
      },
      {
        step: 2,
        action: '超时阈值判断',
        timestamp: new Date(Date.now() - 86400000 * 3),
        result: 'failure',
        details: 'sensor-002最后更新距当前72小时30分',
      },
      {
        step: 3,
        action: '离线标记',
        timestamp: new Date(Date.now() - 86400000 * 3),
        result: 'warning',
        details: '标记P-02为离线状态，建议现场排查',
      },
    ],
  },
  {
    id: 'anomaly-004',
    type: 'water_level_spike',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1800000),
    description: '水位突变检测：W-01读数30分钟内激增230kPa，超出正常范围',
    relatedEntityId: 'sensor-003',
    pathHistory: [
      {
        step: 1,
        action: '实时数据接收',
        timestamp: new Date(Date.now() - 1800000),
        result: 'success',
        details: '收到W-01最新读数：280kPa',
      },
      {
        step: 2,
        action: '时间序列差分分析',
        timestamp: new Date(Date.now() - 1800000 + 1000),
        result: 'failure',
        details: '30分钟变化量+230kPa，远超阈值±50kPa',
      },
      {
        step: 3,
        action: '异常确认',
        timestamp: new Date(Date.now() - 1800000 + 2000),
        result: 'failure',
        details: '连续3个采样点持续异常，确认水位突变',
      },
      {
        step: 4,
        action: '触发紧急预警',
        timestamp: new Date(Date.now() - 1800000 + 3000),
        result: 'warning',
        details: '已生成红色预警，建议立即核查',
      },
    ],
  },
];

export const mockRawFiles: FileInfo[] = [
  {
    id: 'raw-001',
    name: 'dam_model_v2.obj',
    type: 'model',
    size: 2048576,
    uploadTime: new Date('2024-01-15'),
    hash: 'a1b2c3d4e5f6',
  },
  {
    id: 'raw-002',
    name: 'crack_points_202401.xlsx',
    type: 'data',
    size: 102400,
    uploadTime: new Date('2024-01-12'),
    hash: 'b2c3d4e5f6a1',
  },
  {
    id: 'raw-003',
    name: 'sensor_readings_jan.csv',
    type: 'data',
    size: 512000,
    uploadTime: new Date('2024-01-15'),
    hash: 'c3d4e5f6a1b2',
  },
  {
    id: 'raw-004',
    name: 'inspection_notes.docx',
    type: 'note',
    size: 25600,
    uploadTime: new Date('2024-01-13'),
    hash: 'd4e5f6a1b2c3',
  },
];

export const generateHeatMapPoints = (): HeatMapPoint[] => {
  const points: HeatMapPoint[] = [];
  const riskZones: { pos: Vector3; baseRisk: number; label: string }[] = [
    { pos: { x: 20, y: 15, z: 0 }, baseRisk: 0.85, label: '高风险区A' },
    { pos: { x: -15, y: 20, z: 0 }, baseRisk: 0.65, label: '中风险区B' },
    { pos: { x: 0, y: 8, z: 5 }, baseRisk: 0.45, label: '低风险区C' },
    { pos: { x: 10, y: 5, z: 0 }, baseRisk: 0.72, label: '中高风险区D' },
    { pos: { x: -10, y: 5, z: 0 }, baseRisk: 0.3, label: '安全区E' },
  ];

  riskZones.forEach((zone) => {
    for (let i = 0; i < 5; i++) {
      points.push({
        position: {
          x: zone.pos.x + (Math.random() - 0.5) * 8,
          y: zone.pos.y + (Math.random() - 0.5) * 4,
          z: zone.pos.z + (Math.random() - 0.5) * 2,
        },
        riskValue: Math.min(1, Math.max(0, zone.baseRisk + (Math.random() - 0.5) * 0.3)),
        label: zone.label,
      });
    }
  });

  return points;
};

export const mockHeatMapPoints = generateHeatMapPoints();
