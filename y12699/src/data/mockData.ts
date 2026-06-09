import type {
  BatchMaterial, PointCloudData, SliceParam, OutlierPoint,
  CollisionFrame, MeasurementRecord, AnomalyItem
} from '@/types';

export const mockBatches: BatchMaterial[] = [
  {
    id: 'batch-2026-001',
    name: '柔性机械臂A-06批次',
    materialCode: 'FMA-2026-0609-001',
    createdAt: '2026-06-09 09:15:32',
    status: 'processing',
    anomalyCount: 3,
  },
  {
    id: 'batch-2026-002',
    name: '柔性机械臂B-03批次',
    materialCode: 'FMB-2026-0608-003',
    createdAt: '2026-06-08 14:22:10',
    status: 'reviewed',
    anomalyCount: 1,
  },
  {
    id: 'batch-2026-003',
    name: '柔性机械臂C-01批次',
    materialCode: 'FMC-2026-0607-001',
    createdAt: '2026-06-07 10:45:55',
    status: 'completed',
    anomalyCount: 0,
  },
];

function generatePointCloud(batchId: string): PointCloudData {
  const count = 5000;
  const points = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bounds = { minX: -150, maxX: 150, minY: -100, maxY: 100, minZ: 0, maxZ: 300 };

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 60 + Math.random() * 80;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = Math.abs(r * Math.cos(phi)) + 20;

    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;

    const t = z / 300;
    colors[i * 3] = 0.3 + t * 0.3;
    colors[i * 3 + 1] = 0.5 + t * 0.2;
    colors[i * 3 + 2] = 0.8 - t * 0.1;
  }

  return { id: `pc-${batchId}`, batchId, points, colors, bounds };
}

export const mockPointClouds: Record<string, PointCloudData> = {
  'batch-2026-001': generatePointCloud('batch-2026-001'),
  'batch-2026-002': generatePointCloud('batch-2026-002'),
  'batch-2026-003': generatePointCloud('batch-2026-003'),
};

export const defaultSliceParam: SliceParam = {
  planeX: 0,
  planeY: 0,
  planeZ: 150,
  normalX: 0,
  normalY: 0,
  normalZ: 1,
  thickness_mm: 5.0,
  spacing_mm: 2.0,
  isOutOfBounds: false,
  outOfBoundReason: null,
};

export const mockOutliers: Record<string, OutlierPoint[]> = {
  'batch-2026-001': [
    {
      id: 'out-001', batchId: 'batch-2026-001',
      x_mm: 132.5, y_mm: 87.3, z_mm: 245.8,
      deviationSigma: 3.42,
      suspectedCause: '传感器反射异常，表面光洁度过高',
      suggestion: '用磨砂处理测量点后重新扫描，或手动标记剔除',
      reviewed: false,
    },
    {
      id: 'out-002', batchId: 'batch-2026-001',
      x_mm: -128.9, y_mm: -91.2, z_mm: 52.1,
      deviationSigma: 2.87,
      suspectedCause: '环境噪声干扰，附近有强电磁设备',
      suggestion: '关闭周边电磁设备后复核，或降阈值至2.5σ重新检测',
      reviewed: false,
    },
    {
      id: 'out-003', batchId: 'batch-2026-001',
      x_mm: 45.6, y_mm: -142.0, z_mm: 188.4,
      deviationSigma: 2.51,
      suspectedCause: '点云配准偏差，相邻帧重叠不足',
      suggestion: '检查扫描路径重叠率（建议≥30%），重新配准',
      reviewed: true,
    },
  ],
  'batch-2026-002': [
    {
      id: 'out-004', batchId: 'batch-2026-002',
      x_mm: 115.2, y_mm: 72.8, z_mm: 210.0,
      deviationSigma: 2.65,
      suspectedCause: '机械臂表面油污导致激光散射',
      suggestion: '清洁表面后重新测量',
      reviewed: true,
    },
  ],
  'batch-2026-003': [],
};

export const mockCollisionFrames: Record<string, CollisionFrame[]> = {
  'batch-2026-001': Array.from({ length: 21 }, (_, i) => {
    const t = i * 0.5;
    const angle = (i / 20) * Math.PI;
    const hasCollision = i >= 12 && i <= 15;
    return {
      id: `frame-${i}`,
      batchId: 'batch-2026-001',
      timeSecond: t,
      hasCollision,
      collisionDetail: hasCollision
        ? `关节J3与障碍物最小距离 ${(2.5 - (i - 12) * 0.4).toFixed(2)}mm，低于安全阈值5mm`
        : '无碰撞风险，最小距离大于安全阈值',
      minDistance_mm: hasCollision ? 2.5 - (i - 12) * 0.4 : 8 + Math.sin(angle) * 3,
      jointAngles: [0, angle, -angle * 0.5, angle * 0.3, 0, 0],
    };
  }),
};

export const mockMeasurements: Record<string, MeasurementRecord[]> = {
  'batch-2026-001': [
    { id: 'm-001', batchId: 'batch-2026-001', measuredAt: '2026-06-09 09:20:15', measuredValue_mm: 152.3, measurePoint: '关节J1轴径', operator: '张伟' },
    { id: 'm-002', batchId: 'batch-2026-001', measuredAt: '2026-06-09 09:21:40', measuredValue_mm: 98.7, measurePoint: '关节J2轴径', operator: '张伟' },
    { id: 'm-003', batchId: 'batch-2026-001', measuredAt: '2026-06-09 09:23:08', measuredValue_mm: 75.2, measurePoint: '关节J3轴径', operator: '李娜' },
    { id: 'm-004', batchId: 'batch-2026-001', measuredAt: '2026-06-09 09:24:33', measuredValue_mm: 298.5, measurePoint: '臂展总长', operator: '李娜' },
  ],
};

export const mockAnomalies: Record<string, AnomalyItem[]> = {
  'batch-2026-001': [
    {
      id: 'anom-001', batchId: 'batch-2026-001',
      category: 'missing_data', categoryLabel: '缺数据',
      description: '关节J4转角测量记录缺失，当前仅有J1-J3数据',
      nextAction: '补材料', resolved: false,
    },
    {
      id: 'anom-002', batchId: 'batch-2026-001',
      category: 'param_error', categoryLabel: '参数错',
      description: '切片厚度参数0.05mm低于算法下限0.1mm，已自动回退为默认值',
      nextAction: '改口径', resolved: true,
    },
    {
      id: 'anom-003', batchId: 'batch-2026-001',
      category: 'algo_limit', categoryLabel: '算法超限',
      description: '点云密度局部差异达8.2倍，统计滤波结果可能存在误判',
      nextAction: '改口径', resolved: false,
    },
  ],
};
