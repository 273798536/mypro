import { ExperimentObject, MaintenanceNote, ParameterSet, CalculationResult, AbnormalRecord } from '../types';

export const mockObjects: ExperimentObject[] = [
  {
    id: 'obj-001',
    name: '北墙',
    type: 'wall',
    position: { x: -5, y: 1.5, z: 0 },
    size: { x: 0.2, y: 3, z: 8 },
    material: '混凝土',
    absorptionCoeff: 0.02,
    color: '#94A3B8'
  },
  {
    id: 'obj-002',
    name: '南墙',
    type: 'wall',
    position: { x: 5, y: 1.5, z: 0 },
    size: { x: 0.2, y: 3, z: 8 },
    material: '混凝土',
    absorptionCoeff: 0.02,
    color: '#94A3B8'
  },
  {
    id: 'obj-003',
    name: '东墙',
    type: 'wall',
    position: { x: 0, y: 1.5, z: 4 },
    size: { x: 10, y: 3, z: 0.2 },
    material: '吸音板',
    absorptionCoeff: 0.65,
    color: '#06B6D4'
  },
  {
    id: 'obj-004',
    name: '西墙',
    type: 'wall',
    position: { x: 0, y: 1.5, z: -4 },
    size: { x: 10, y: 3, z: 0.2 },
    material: '混凝土',
    absorptionCoeff: 0.02,
    color: '#94A3B8'
  },
  {
    id: 'obj-005',
    name: '天花板',
    type: 'ceiling',
    position: { x: 0, y: 3, z: 0 },
    size: { x: 10, y: 0.2, z: 8 },
    material: '矿棉板',
    absorptionCoeff: 0.45,
    color: '#CBD5E1'
  },
  {
    id: 'obj-006',
    name: '地板',
    type: 'floor',
    position: { x: 0, y: 0, z: 0 },
    size: { x: 10, y: 0.2, z: 8 },
    material: '木质地板',
    absorptionCoeff: 0.15,
    color: '#A16207'
  },
  {
    id: 'obj-007',
    name: '声源 A',
    type: 'source',
    position: { x: -2, y: 1.2, z: 0 },
    size: { x: 0.3, y: 0.3, z: 0.3 },
    material: '扬声器',
    absorptionCoeff: 0,
    color: '#EF4444'
  },
  {
    id: 'obj-008',
    name: '接收点 1',
    type: 'receiver',
    position: { x: 2, y: 1.2, z: 1.5 },
    size: { x: 0.2, y: 0.2, z: 0.2 },
    material: '麦克风',
    absorptionCoeff: 0,
    color: '#10B981'
  }
];

export const mockNotes: MaintenanceNote[] = [
  {
    id: 'note-001',
    objectId: 'obj-003',
    content: '东墙吸音板更换后测量，吸声面积增加 2.5 平方米',
    rawValue: '2.5 m²',
    unit: 'm²',
    convertedValue: 2.5,
    timestamp: '2026-06-10T09:30:00Z',
    recorder: '小林',
    version: 1
  },
  {
    id: 'note-002',
    objectId: 'obj-007',
    content: '声源位置调整，混响时间测量值 1.8 秒',
    rawValue: '1.8 s',
    unit: 's',
    convertedValue: 1.8,
    timestamp: '2026-06-10T10:15:00Z',
    recorder: '小林',
    version: 1
  },
  {
    id: 'note-003',
    objectId: 'obj-008',
    content: '接收点 1 第一次测量：混响时间 1800 毫秒',
    rawValue: '1800 ms',
    unit: 'ms',
    convertedValue: 1.8,
    timestamp: '2026-06-10T11:00:00Z',
    recorder: '小林',
    version: 1
  },
  {
    id: 'note-004',
    objectId: 'obj-003',
    content: '补充：东墙吸音板实际面积 250 平方分米',
    rawValue: '250 cm²',
    unit: 'cm²',
    convertedValue: 0.025,
    timestamp: '2026-06-10T14:20:00Z',
    recorder: '小林',
    version: 2,
    parentId: 'note-001'
  },
  {
    id: 'note-005',
    objectId: 'obj-008',
    content: '接收点 1 第二次测量：150 秒（疑似单位写错）',
    rawValue: '150 s',
    unit: 's',
    convertedValue: 150,
    timestamp: '2026-06-11T08:45:00Z',
    recorder: '小林',
    version: 1
  },
  {
    id: 'note-006',
    objectId: 'obj-005',
    content: '天花板矿棉板吸声系数 0.5（噪声测量期间存在干扰）',
    rawValue: '0.5',
    unit: '',
    convertedValue: 0.5,
    timestamp: '2026-06-11T09:30:00Z',
    recorder: '小林',
    version: 1
  },
  {
    id: 'note-007',
    objectId: 'obj-008',
    content: '接收点 1 第三次测量：1.56 秒，确认数据有效',
    rawValue: '1.56 s',
    unit: 's',
    convertedValue: 1.56,
    timestamp: '2026-06-12T10:00:00Z',
    recorder: '小林',
    version: 2,
    parentId: 'note-005'
  }
];

export const mockParameterSets: ParameterSet[] = [
  {
    id: 'param-001',
    name: '标准参数组 A',
    parameters: {
      roomVolume: 240,
      totalAbsorption: 35,
      temperature: 20,
      humidity: 50
    },
    creator: '负责人',
    timestamp: '2026-06-01T00:00:00Z'
  },
  {
    id: 'param-002',
    name: '夏季参数组 B',
    parameters: {
      roomVolume: 240,
      totalAbsorption: 38,
      temperature: 28,
      humidity: 70
    },
    creator: '负责人',
    timestamp: '2026-06-01T00:00:00Z'
  },
  {
    id: 'param-003',
    name: '极端条件组 C',
    parameters: {
      roomVolume: 240,
      totalAbsorption: 32,
      temperature: 35,
      humidity: 30
    },
    creator: '负责人',
    timestamp: '2026-06-05T00:00:00Z'
  }
];

export const mockResults: CalculationResult[] = [];

export const mockAbnormalRecords: AbnormalRecord[] = [
  {
    id: 'abn-001',
    noteId: 'note-004',
    type: 'unit_mismatch',
    reason: '数值与历史均值相差 100 倍，疑似单位写错导致数量级错误。历史记录使用单位为 m²，当前使用 cm²，请注意单位换算',
    impactScope: [
      '影响对象 obj-003 的 2 条历史记录',
      '声学参数计算基准将受到影响'
    ],
    confirmed: false
  },
  {
    id: 'abn-002',
    noteId: 'note-005',
    type: 'extreme_value',
    reason: '数值 150 s 超出混响时间预期范围 [0.1, 10] s；Z-score 136.37 超过阈值 3，历史均值 1.6800，标准差 1.0880',
    impactScope: [
      '影响对象 obj-008 的 3 条历史记录',
      '可能影响同期记录的 1 个关联对象',
      '混响时间计算将受到直接影响'
    ],
    confirmed: false
  },
  {
    id: 'abn-003',
    noteId: 'note-006',
    type: 'noise',
    reason: '备注中包含噪声相关关键词，疑似存在干扰信号',
    impactScope: [
      '影响对象 obj-005 的 1 条历史记录',
      '声学参数计算基准将受到影响'
    ],
    confirmed: true,
    confirmer: '负责人',
    confirmedAt: '2026-06-11T10:00:00Z'
  }
];
