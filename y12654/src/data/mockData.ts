import type {
  RunVersion,
  MeasurementRecord,
  SavedViewpoint,
  InterceptionRule,
  AnomalyType,
  ProcessStatus,
} from '@/types';

export const mockVersions: RunVersion[] = [
  { id: 'run-002', timestamp: '2026-06-09 14:30:22', label: '本次运行' },
  { id: 'run-001', timestamp: '2026-06-02 10:15:08', label: '上次运行' },
];

const generateAnomaly = (
  id: string,
  recordId: string,
  type: AnomalyType,
  status: ProcessStatus,
  partName: string,
  pos: { x: number; y: number; z: number },
  measured: number,
  standard: number,
  threshold: number,
): MeasurementRecord['anomalies'][number] => {
  return {
    id,
    recordId,
    type,
    status,
    measuredValue: measured,
    standardValue: standard,
    deviation: measured - standard,
    threshold,
    description:
      type === 'coordinate_mismatch'
        ? '该部位采样数据同时存在 WGS84 与地方坐标系标识，拼装时发生错位'
        : type === 'timing_desync'
        ? '采集时间戳与批次基准时间偏差超过阈值'
        : type === 'precision_overrun'
        ? '测量精度低于工程要求下限'
        : '关键属性字段为空或缺失',
    position3d: pos,
    partName,
  };
};

const makeRecord = (
  id: string,
  runId: string,
  idx: number,
  anomalyConfigs: Array<{
    aid: string;
    type: AnomalyType;
    status: ProcessStatus;
    part: string;
    pos: { x: number; y: number; z: number };
    mv: number;
    sv: number;
    th: number;
  }>,
  status: ProcessStatus,
): MeasurementRecord => {
  const now =
    runId === 'run-002' ? '2026-06-09 14:30:22' : '2026-06-02 10:15:08';
  return {
    id,
    timestamp: now,
    runId,
    anomalies: anomalyConfigs.map((c) =>
      generateAnomaly(c.aid, id, c.type, c.status, c.part, c.pos, c.mv, c.sv, c.th),
    ),
    source: {
      upstreamId: `UP-${runId.slice(-3)}-${String(idx).padStart(4, '0')}`,
      collectedAt: now,
      device: `三维扫描仪-${(idx % 3) + 1}号`,
      operator: idx % 2 === 0 ? '张伟' : '李娜',
      location: `拼装段 A${(idx % 5) + 1}`,
    },
    opinion: {
      systemSuggestion:
        status === 'need_calibration'
          ? '建议统一坐标系参数并重新校准采集设备时间同步'
          : status === 'need_material'
          ? '建议补充该部位原始测量数据或重新采样'
          : '已按规范复核通过',
      manualNote: '',
      decision: status,
      riskRemarks: '',
    },
    createdAt: now,
  };
};

export const mockRecords: MeasurementRecord[] = [
  // 本次运行 run-002 - 7 条
  makeRecord(
    'rec-2001',
    'run-002',
    1,
    [
      { aid: 'a-2001-1', type: 'coordinate_mismatch', status: 'need_calibration', part: '线粒体-外膜#3', pos: { x: 1.2, y: 0.5, z: -0.3 }, mv: 1, sv: 0, th: 0.5 },
    ],
    'need_calibration',
  ),
  makeRecord(
    'rec-2002',
    'run-002',
    2,
    [
      { aid: 'a-2002-1', type: 'timing_desync', status: 'need_calibration', part: '核糖体-A亚基#12', pos: { x: -0.8, y: 1.1, z: 0.6 }, mv: 2350, sv: 0, th: 1000 },
    ],
    'need_calibration',
  ),
  makeRecord(
    'rec-2003',
    'run-002',
    3,
    [
      { aid: 'a-2003-1', type: 'precision_overrun', status: 'need_material', part: '内质网-粗面#7', pos: { x: 0.3, y: -0.9, z: 1.4 }, mv: 0.085, sv: 0.05, th: 0.01 },
      { aid: 'a-2003-2', type: 'data_missing', status: 'need_material', part: '内质网-光面#7', pos: { x: 0.5, y: -0.8, z: 1.6 }, mv: 0, sv: 1, th: 0.5 },
    ],
    'need_material',
  ),
  makeRecord(
    'rec-2004',
    'run-002',
    4,
    [
      { aid: 'a-2004-1', type: 'coordinate_mismatch', status: 'need_calibration', part: '高尔基体-顺面#2', pos: { x: -1.5, y: 0.2, z: -1.0 }, mv: 1, sv: 0, th: 0.5 },
    ],
    'need_calibration',
  ),
  makeRecord(
    'rec-2005',
    'run-002',
    5,
    [
      { aid: 'a-2005-1', type: 'data_missing', status: 'need_material', part: '溶酶体-腔体#5', pos: { x: 0.9, y: -1.2, z: -0.5 }, mv: 0, sv: 1, th: 0.5 },
    ],
    'need_material',
  ),
  makeRecord(
    'rec-2006',
    'run-002',
    6,
    [
      { aid: 'a-2006-1', type: 'precision_overrun', status: 'resolved', part: '叶绿体-类囊体#4', pos: { x: -0.4, y: 1.4, z: -0.7 }, mv: 0.062, sv: 0.05, th: 0.01 },
    ],
    'resolved',
  ),
  makeRecord(
    'rec-2007',
    'run-002',
    7,
    [
      { aid: 'a-2007-1', type: 'timing_desync', status: 'need_calibration', part: '中心粒-微管#9', pos: { x: 0.0, y: -0.5, z: 0.0 }, mv: 1850, sv: 0, th: 1000 },
      { aid: 'a-2007-2', type: 'coordinate_mismatch', status: 'need_calibration', part: '中心粒-基体#9', pos: { x: 0.2, y: -0.6, z: 0.1 }, mv: 1, sv: 0, th: 0.5 },
    ],
    'need_calibration',
  ),

  // 上次运行 run-001 - 6 条
  makeRecord(
    'rec-1001',
    'run-001',
    1,
    [
      { aid: 'a-1001-1', type: 'coordinate_mismatch', status: 'need_calibration', part: '线粒体-内膜#2', pos: { x: 0.8, y: 0.3, z: -0.5 }, mv: 1, sv: 0, th: 0.5 },
    ],
    'need_calibration',
  ),
  makeRecord(
    'rec-1002',
    'run-001',
    2,
    [
      { aid: 'a-1002-1', type: 'timing_desync', status: 'need_calibration', part: '核糖体-B亚基#8', pos: { x: -0.5, y: 0.9, z: 0.8 }, mv: 1650, sv: 0, th: 1000 },
    ],
    'need_calibration',
  ),
  makeRecord(
    'rec-1003',
    'run-001',
    3,
    [
      { aid: 'a-1003-1', type: 'precision_overrun', status: 'need_material', part: '内质网-粗面#3', pos: { x: 0.1, y: -0.7, z: 1.1 }, mv: 0.072, sv: 0.05, th: 0.01 },
    ],
    'need_material',
  ),
  makeRecord(
    'rec-1004',
    'run-001',
    4,
    [
      { aid: 'a-1004-1', type: 'data_missing', status: 'resolved', part: '高尔基体-反面#1', pos: { x: -1.2, y: 0.0, z: -0.8 }, mv: 0, sv: 1, th: 0.5 },
    ],
    'resolved',
  ),
  makeRecord(
    'rec-1005',
    'run-001',
    5,
    [
      { aid: 'a-1005-1', type: 'coordinate_mismatch', status: 'resolved', part: '溶酶体-膜#3', pos: { x: 0.6, y: -0.9, z: -0.2 }, mv: 1, sv: 0, th: 0.5 },
    ],
    'resolved',
  ),
  makeRecord(
    'rec-1006',
    'run-001',
    6,
    [
      { aid: 'a-1006-1', type: 'timing_desync', status: 'need_calibration', part: '中心粒-轴丝#5', pos: { x: -0.2, y: -0.3, z: 0.3 }, mv: 1200, sv: 0, th: 1000 },
    ],
    'need_calibration',
  ),
];

export const mockViewpoints: SavedViewpoint[] = [
  {
    id: 'vp-001',
    name: '整体俯视视角',
    recordId: 'rec-2001',
    camera: {
      position: [0, 5, 5],
      target: [0, 0, 0],
    },
    createdAt: '2026-06-09 15:02:11',
  },
  {
    id: 'vp-002',
    name: '异常部位特写',
    recordId: 'rec-2001',
    camera: {
      position: [2.5, 1.2, -0.8],
      target: [1.2, 0.5, -0.3],
    },
    createdAt: '2026-06-09 15:04:33',
  },
];

export const mockInterceptionRules: InterceptionRule[] = [
  {
    anomalyType: 'coordinate_mismatch',
    ruleName: '坐标系一致性校验',
    ruleDescription: '同一条拼装记录内所有子构件必须使用同一坐标系基准（WGS84 或地方坐标系二者择一），禁止混用。',
    criteria: '当单条记录中同时出现 ≥2 种坐标系标识，或相邻构件坐标偏差超过 0.5mm 时触发拦截。',
    consequence: '坐标系混用会导致三维拼装模型出现毫米级错位，影响后续力学仿真与工程验收，必须在改口径后重新导入。',
  },
  {
    anomalyType: 'timing_desync',
    ruleName: '时间轴同步校验',
    ruleDescription: '同一批次内所有测量数据的采集时间戳必须与批次基准时间差在 1000ms 以内。',
    criteria: '单条记录采集时间戳与批次基准时间偏差 >1000ms 时触发。',
    consequence: '时间轴不同步会导致拼装顺序错乱，引发返工；需要校准设备时钟并重新采集或改口径。',
  },
  {
    anomalyType: 'precision_overrun',
    ruleName: '精度阈值校验',
    ruleDescription: '所有关键部位测量精度不得低于工程规范要求的 0.05mm。',
    criteria: '测量精度误差 >0.01mm（即精度 <0.04mm 或 >0.06mm）时触发。',
    consequence: '精度超限会影响拼装后的密封性与结构强度，需要补采高精度原始数据。',
  },
  {
    anomalyType: 'data_missing',
    ruleName: '关键字段完整性校验',
    ruleDescription: '每条测量记录的坐标、时间戳、设备编号、操作员四项关键字段不得为空。',
    criteria: '任意关键字段缺失或解析失败时触发。',
    consequence: '缺失字段无法通过复核流程，需要补充原始材料或重新采集。',
  },
];
