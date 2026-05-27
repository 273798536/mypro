import { ExperimentData, Measurement } from '../types';

const createMeasurement = (
  nodeNumber: number,
  tubeLength: number,
  isOutlier: boolean = false,
  isTemperatureCorrected: boolean = true
): Measurement => ({
  id: `meas-${Date.now()}-${nodeNumber}-${Math.random().toString(36).substr(2, 9)}`,
  nodeNumber,
  tubeLength,
  isOutlier,
  isTemperatureCorrected,
  createdAt: new Date().toISOString(),
});

export const mockExperiments: ExperimentData[] = [
  {
    id: 'exp-001',
    studentName: '张三',
    experimentDate: '2026-05-20',
    temperature: 24.5,
    frequency: 1000,
    measurements: [
      createMeasurement(1, 8.2),
      createMeasurement(2, 25.1),
      createMeasurement(3, 42.3),
      createMeasurement(4, 59.0),
      createMeasurement(5, 75.8),
    ],
    notes: '室温24.5°C，频率1kHz，实验过程顺利',
    createdAt: '2026-05-20T10:30:00Z',
    updatedAt: '2026-05-20T10:30:00Z',
  },
  {
    id: 'exp-002',
    studentName: '李四',
    experimentDate: '2026-05-21',
    temperature: 26.8,
    frequency: 1500,
    measurements: [
      createMeasurement(1, 5.3),
      createMeasurement(2, 17.2),
      createMeasurement(3, 28.9, true),
      createMeasurement(4, 40.1),
      createMeasurement(5, 51.5),
    ],
    notes: '第三组数据可能有误，已标记为离群值',
    createdAt: '2026-05-21T14:15:00Z',
    updatedAt: '2026-05-21T15:00:00Z',
  },
  {
    id: 'exp-003',
    studentName: '王五',
    experimentDate: '2026-05-22',
    temperature: 22.0,
    frequency: 800,
    measurements: [
      createMeasurement(1, 10.5, false, false),
      createMeasurement(2, 31.8, false, false),
      createMeasurement(3, 53.2, false, false),
      createMeasurement(4, 74.5, false, false),
    ],
    notes: '未进行温度修正，需要重新处理',
    createdAt: '2026-05-22T09:00:00Z',
    updatedAt: '2026-05-22T09:00:00Z',
  },
  {
    id: 'exp-004',
    studentName: '赵六',
    experimentDate: '2026-05-25',
    temperature: 25.2,
    frequency: 1200,
    measurements: [
      createMeasurement(1, 6.8),
      createMeasurement(2, 21.5),
      createMeasurement(3, 36.2),
      createMeasurement(4, 50.9),
      createMeasurement(5, 65.6),
      createMeasurement(6, 80.3),
    ],
    notes: '6组完整数据，实验结果良好',
    createdAt: '2026-05-25T11:30:00Z',
    updatedAt: '2026-05-25T11:30:00Z',
  },
];

export const generateId = (): string => {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
