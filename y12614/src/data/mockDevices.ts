import type { Device, DetectionResult } from '@/types';

const createMockDetections: DetectionResult[] = [
  {
    id: 'det-001',
    type: 'success',
    passed: true,
    description: '颜色越界检测通过',
    explanation: '圈选区域颜色在正常范围内'
  },
  {
    id: 'det-002',
    type: 'collision',
    passed: false,
    description: '边界碰撞检测未通过',
    explanation: '圈选区域与叶片边缘发生碰撞'
  },
  {
    id: 'det-003',
    type: 'color-boundary',
    passed: false,
    description: '颜色越界检测未通过',
    explanation: '圈选区域包含异常颜色像素占比过高'
  }
];

export const mockDevices: Device[] = [
  {
    id: 'device-001',
    name: '检测设备A-01',
    model: 'LeafScan Pro 2000',
    status: 'active',
    passRate: 87.5,
    detections: createMockDetections
  },
  {
    id: 'device-002',
    name: '检测设备A-02',
    model: 'LeafScan 2000',
    status: 'active',
    passRate: 92.3,
    detections: createMockDetections
  },
  {
    id: 'device-003',
    name: '检测设备B-01',
    model: 'LeafScan 3000',
    status: 'maintenance',
    passRate: 78.2,
    detections: createMockDetections
  },
  {
    id: 'device-004',
    name: '检测设备B-02',
    model: 'LeafScan 3000',
    status: 'active',
    passRate: 95.8,
    detections: createMockDetections
  },
  {
    id: 'device-005',
    name: '检测设备C-01',
    model: 'LeafScan 4000',
    status: 'inactive',
    passRate: 88.1,
    detections: createMockDetections
  }
];

export const getDeviceById = (id: string): Device | undefined => {
  return mockDevices.find(device => device.id === id);
};

export const getDeviceStats = () => {
  const total = mockDevices.length;
  const active = mockDevices.filter(d => d.status === 'active').length;
  const avgPassRate = mockDevices.reduce((sum, d) => sum + d.passRate, 0) / total;
  const colorBoundaryCount = mockDevices.flatMap(d => d.detections).filter(d => d.type === 'color-boundary').length;
  const collisionCount = mockDevices.flatMap(d => d.detections).filter(d => d.type === 'collision').length;
  const successCount = mockDevices.flatMap(d => d.detections).filter(d => d.type === 'success').length;

  return {
    total,
    active,
    avgPassRate: Math.round(avgPassRate * 10) / 10,
    errorDistribution: {
      colorBoundary: colorBoundaryCount,
      collision: collisionCount,
      success: successCount
    }
  };
};
