import type {
  RobotConfig,
  AngleDataPoint,
  LoadDataPoint,
  DataSource,
  TorqueResult,
  ConflictRecord,
  IssueRecord,
} from '../types';

// 生成唯一ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// 机器人配置 - 6轴工业机器人
export const mockRobotConfig: RobotConfig = {
  id: 'robot-001',
  name: 'IRB-6700 工业机器人',
  defaultPayload: 200,
  joints: [
    {
      id: 'joint-1',
      name: 'J1 - 底座旋转',
      index: 1,
      minAngle: -180,
      maxAngle: 180,
      maxTorque: 1500,
      position: [0, 0, 0],
      color: '#165DFF',
    },
    {
      id: 'joint-2',
      name: 'J2 - 大臂',
      index: 2,
      minAngle: -60,
      maxAngle: 120,
      maxTorque: 2000,
      position: [0, 0.5, 0.3],
      color: '#368BFF',
    },
    {
      id: 'joint-3',
      name: 'J3 - 小臂',
      index: 3,
      minAngle: -120,
      maxAngle: 60,
      maxTorque: 1800,
      position: [0, 1.2, 0.5],
      color: '#5CA6FF',
    },
    {
      id: 'joint-4',
      name: 'J4 - 腕部旋转',
      index: 4,
      minAngle: -360,
      maxAngle: 360,
      maxTorque: 500,
      position: [0, 1.8, 0.6],
      color: '#8DC2FF',
    },
    {
      id: 'joint-5',
      name: 'J5 - 腕部摆动',
      index: 5,
      minAngle: -120,
      maxAngle: 120,
      maxTorque: 400,
      position: [0, 2.1, 0.65],
      color: '#B9DBFF',
    },
    {
      id: 'joint-6',
      name: 'J6 - 末端旋转',
      index: 6,
      minAngle: -360,
      maxAngle: 360,
      maxTorque: 200,
      position: [0, 2.3, 0.68],
      color: '#E8F3FF',
    },
  ],
  links: [
    {
      id: 'link-1',
      name: '底座',
      length: 0.5,
      mass: 150,
      parentJoint: 'joint-1',
      childJoint: 'joint-2',
      hasLoad: true,
      loadMass: 150,
    },
    {
      id: 'link-2',
      name: '大臂',
      length: 0.8,
      mass: 120,
      parentJoint: 'joint-2',
      childJoint: 'joint-3',
      hasLoad: true,
      loadMass: 120,
    },
    {
      id: 'link-3',
      name: '小臂',
      length: 0.7,
      mass: 80,
      parentJoint: 'joint-3',
      childJoint: 'joint-4',
      hasLoad: true,
      loadMass: 80,
    },
    {
      id: 'link-4',
      name: '腕部1',
      length: 0.3,
      mass: 30,
      parentJoint: 'joint-4',
      childJoint: 'joint-5',
      hasLoad: true,
      loadMass: 30,
    },
    {
      id: 'link-5',
      name: '腕部2',
      length: 0.2,
      mass: 20,
      parentJoint: 'joint-5',
      childJoint: 'joint-6',
      hasLoad: true,
      loadMass: 20,
    },
    {
      id: 'link-6',
      name: '末端法兰',
      length: 0.1,
      mass: 10,
      parentJoint: 'joint-6',
      childJoint: '',
      hasLoad: false,
      loadMass: 0,
    },
  ],
};

// 生成时间序列角度数据
const generateAngleData = (jointId: string, baseAngle: number, amplitude: number, points: number): AngleDataPoint[] => {
  const data: AngleDataPoint[] = [];
  for (let i = 0; i < points; i++) {
    const timestamp = i * 100;
    const noise = (Math.random() - 0.5) * 5;
    const angle = baseAngle + Math.sin((i / points) * Math.PI * 2) * amplitude + noise;
    data.push({ jointId, angle, timestamp });
  }
  return data;
};

// 角度数据源 A
export const mockAngleDataA: DataSource<AngleDataPoint> = {
  id: 'angle-a',
  name: '关节角度数据 - 张工',
  source: '张工-运动规划组',
  importedAt: '2024-01-15 10:30:00',
  data: [
    ...generateAngleData('joint-1', 0, 90, 100),
    ...generateAngleData('joint-2', 45, 30, 100),
    ...generateAngleData('joint-3', -30, 40, 100),
    ...generateAngleData('joint-4', 0, 180, 100),
    ...generateAngleData('joint-5', 30, 45, 100),
    ...generateAngleData('joint-6', 0, 180, 100),
  ],
};

// 角度数据源 B（带冲突）
export const mockAngleDataB: DataSource<AngleDataPoint> = {
  id: 'angle-b',
  name: '关节角度数据 - 李工',
  source: '李工-轨迹优化组',
  importedAt: '2024-01-15 11:15:00',
  data: [
    ...generateAngleData('joint-1', 10, 85, 100),
    ...generateAngleData('joint-2', 50, 35, 100),
    ...generateAngleData('joint-3', -25, 38, 100),
    ...generateAngleData('joint-4', 0, 180, 100),
    ...generateAngleData('joint-5', 35, 50, 100),
    ...generateAngleData('joint-6', 0, 180, 100),
  ],
};

// 生成负载数据
const generateLoadData = (linkId: string, baseMass: number, variance: number, points: number): LoadDataPoint[] => {
  const data: LoadDataPoint[] = [];
  for (let i = 0; i < points; i++) {
    const timestamp = i * 100;
    const noise = (Math.random() - 0.5) * variance;
    data.push({
      linkId,
      mass: baseMass + noise,
      centerOfMass: [0, 0.1, 0],
      timestamp,
    });
  }
  return data;
};

// 负载数据源 A
export const mockLoadDataA: DataSource<LoadDataPoint> = {
  id: 'load-a',
  name: '负载数据 - 王工',
  source: '王工-机械设计组',
  importedAt: '2024-01-15 09:00:00',
  data: [
    ...generateLoadData('link-1', 150, 5, 100),
    ...generateLoadData('link-2', 120, 4, 100),
    ...generateLoadData('link-3', 80, 3, 100),
    ...generateLoadData('link-4', 30, 2, 100),
    ...generateLoadData('link-5', 20, 1, 100),
    ...generateLoadData('link-6', 10, 1, 100),
  ],
};

// 负载数据源 B（带冲突和缺失）
export const mockLoadDataB: DataSource<LoadDataPoint> = {
  id: 'load-b',
  name: '负载数据 - 赵工',
  source: '赵工-动力学组',
  importedAt: '2024-01-15 09:30:00',
  data: [
    ...generateLoadData('link-1', 155, 5, 100),
    ...generateLoadData('link-2', 125, 4, 100),
    ...generateLoadData('link-3', 0, 0, 100),
    ...generateLoadData('link-4', 32, 2, 100),
    ...generateLoadData('link-5', 22, 1, 100),
    ...generateLoadData('link-6', 12, 1, 100),
  ],
};

// 模拟扭矩计算结果
export const generateMockTorqueResults = (): TorqueResult[] => {
  const joints = mockRobotConfig.joints;
  return joints.map((joint) => {
    const curve = [];
    const overLimitPoints: number[] = [];
    let maxTorque = 0;

    for (let i = 0; i < 100; i++) {
      const timestamp = i * 100;
      const baseValue = joint.maxTorque * 0.6;
      const amplitude = joint.maxTorque * 0.35;
      const value = baseValue + Math.sin((i / 100) * Math.PI * 3) * amplitude + (Math.random() - 0.5) * 50;

      if (value > joint.maxTorque) {
        overLimitPoints.push(timestamp);
      }
      maxTorque = Math.max(maxTorque, value);

      curve.push({
        timestamp,
        value,
        angle: (Math.random() - 0.5) * 180,
        load: 50 + Math.random() * 150,
      });
    }

    return {
      jointId: joint.id,
      jointName: joint.name,
      curve,
      maxTorque,
      minTorque: Math.min(...curve.map((p) => p.value)),
      threshold: joint.maxTorque,
      isOverLimit: overLimitPoints.length > 0,
      overLimitPoints,
    };
  });
};

// 模拟冲突记录
export const mockConflicts: ConflictRecord[] = [
  {
    id: 'conflict-1',
    type: 'angle',
    rowIndex: 25,
    field: 'joint-2-angle',
    valueA: 58.5,
    valueB: 65.2,
    resolved: false,
    description: 'J2关节角度差异超过5度阈值',
  },
  {
    id: 'conflict-2',
    type: 'load',
    rowIndex: 10,
    field: 'link-3-mass',
    valueA: 82.3,
    valueB: 0,
    resolved: false,
    description: '小臂连杆负载数据缺失（B组数据为0）',
  },
  {
    id: 'conflict-3',
    type: 'angle',
    rowIndex: 67,
    field: 'joint-5-angle',
    valueA: 42.1,
    valueB: 55.8,
    resolved: false,
    description: 'J5关节角度差异超过10度阈值',
  },
  {
    id: 'conflict-4',
    type: 'load',
    rowIndex: 45,
    field: 'link-1-mass',
    valueA: 148.5,
    valueB: 156.2,
    resolved: false,
    description: '底座质量差异超过5kg',
  },
];

// 模拟问题记录
export const mockIssues: IssueRecord[] = [
  {
    id: 'issue-1',
    type: 'missing_load',
    severity: 'critical',
    position: '连杆3 (小臂)',
    description: '小臂连杆负载数据完全缺失，扭矩计算结果不可信',
    referenceId: 'conflict-2',
    timestamp: '2024-01-15 14:22:35',
  },
  {
    id: 'issue-2',
    type: 'angle_out_of_range',
    severity: 'error',
    position: '关节2 (大臂)',
    description: 'J2关节在第45帧时角度达到125度，超出最大允许角度120度',
    referenceId: 'joint-2',
    timestamp: '2024-01-15 14:22:38',
  },
  {
    id: 'issue-3',
    type: 'torque_over_limit',
    severity: 'error',
    position: '关节2 (大臂)',
    description: 'J2关节扭矩在多个时间点超过阈值，最大超限12.5%',
    referenceId: 'joint-2',
    timestamp: '2024-01-15 14:22:40',
  },
  {
    id: 'issue-4',
    type: 'fixture_misuse',
    severity: 'warning',
    position: '末端法兰',
    description: '检测到非常规夹具配置，请确认夹具型号是否正确（记录编号: FIX-2024-015）',
    referenceId: 'link-6',
    timestamp: '2024-01-15 14:22:42',
  },
  {
    id: 'issue-5',
    type: 'angle_out_of_range',
    severity: 'warning',
    position: '关节5 (腕部摆动)',
    description: 'J5关节接近最大角度边界，建议优化轨迹规划',
    referenceId: 'joint-5',
    timestamp: '2024-01-15 14:22:45',
  },
];
