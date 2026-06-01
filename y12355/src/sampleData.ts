import type { Batch, PendulumRecord } from './types';

const now = Date.now();

export const createSampleBatches = (): Batch[] => [
  {
    id: 'batch-normal',
    name: '批次A：标准小角度实验',
    description: '摆角控制在10°以内，验证小角度近似公式',
    createdAt: now - 3600000,
    recordIds: ['rec-1', 'rec-2', 'rec-3', 'rec-4']
  },
  {
    id: 'batch-large-angle',
    name: '批次B：大角度对比实验',
    description: '故意使用大角度，对比小角度与大角度公式的差异',
    createdAt: now - 1800000,
    recordIds: ['rec-5', 'rec-6', 'rec-7', 'rec-8']
  },
  {
    id: 'batch-anomaly',
    name: '批次C：含异常场景的练习数据',
    description: '包含单位错误、漏拍等常见问题，用于训练异常检测',
    createdAt: now - 60000,
    recordIds: ['rec-9', 'rec-10', 'rec-11', 'rec-12']
  }
];

export const createSampleRecords = (): PendulumRecord[] => [
  {
    id: 'rec-1',
    batchId: 'batch-normal',
    length: 1.000,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 5.0,
    angleUnit: 'deg',
    measuredPeriod: 2.007,
    measuredCount: 10,
    totalTiming: 20.07,
    timestamp: now - 3600000,
    notes: '第一组标准实验，钢球直径2cm，细线质量可忽略',
    sourceRef: '实验记录本P15'
  },
  {
    id: 'rec-2',
    batchId: 'batch-normal',
    length: 0.750,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 8.0,
    angleUnit: 'deg',
    measuredPeriod: 1.738,
    measuredCount: 10,
    totalTiming: 17.38,
    timestamp: now - 3500000,
    notes: '缩短摆长，周期变短，符合理论预期',
    sourceRef: '实验记录本P15'
  },
  {
    id: 'rec-3',
    batchId: 'batch-normal',
    length: 0.500,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 3.5,
    angleUnit: 'deg',
    measuredPeriod: 1.419,
    measuredCount: 15,
    totalTiming: 21.285,
    timestamp: now - 3400000,
    notes: '摆长减半，周期变为√2/2倍，验证T∝√L关系',
    sourceRef: '实验记录本P16'
  },
  {
    id: 'rec-4',
    batchId: 'batch-normal',
    length: 1.500,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 6.0,
    angleUnit: 'deg',
    measuredPeriod: 2.458,
    measuredCount: 8,
    totalTiming: 19.664,
    timestamp: now - 3300000,
    notes: '长摆，周期更大，需要注意摆动稳定性',
    sourceRef: '实验记录本P16'
  },
  {
    id: 'rec-5',
    batchId: 'batch-large-angle',
    length: 1.000,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 20.0,
    angleUnit: 'deg',
    measuredPeriod: 2.025,
    measuredCount: 10,
    totalTiming: 20.25,
    timestamp: now - 1800000,
    notes: '摆角20°，明显超过小角度近似范围',
    sourceRef: '实验记录本P18'
  },
  {
    id: 'rec-6',
    batchId: 'batch-large-angle',
    length: 1.000,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 35.0,
    angleUnit: 'deg',
    measuredPeriod: 2.068,
    measuredCount: 10,
    totalTiming: 20.68,
    timestamp: now - 1700000,
    notes: '摆角35°，大角度修正量超过3%',
    sourceRef: '实验记录本P18'
  },
  {
    id: 'rec-7',
    batchId: 'batch-large-angle',
    length: 0.800,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 45.0,
    angleUnit: 'deg',
    measuredPeriod: 1.875,
    measuredCount: 10,
    totalTiming: 18.75,
    timestamp: now - 1600000,
    notes: '摆角45°，修正量约7%，必须用大角度公式',
    sourceRef: '实验记录本P19'
  },
  {
    id: 'rec-8',
    batchId: 'batch-large-angle',
    length: 1.200,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 60.0,
    angleUnit: 'deg',
    measuredPeriod: 2.412,
    measuredCount: 8,
    totalTiming: 19.296,
    timestamp: now - 1500000,
    notes: '摆角60°，极端大角度，修正量超过15%',
    sourceRef: '实验记录本P19'
  },
  {
    id: 'rec-9',
    batchId: 'batch-anomaly',
    length: 50.0,
    lengthUnit: 'm',
    lengthUnitConfirmed: false,
    angle: 5.0,
    angleUnit: 'deg',
    measuredPeriod: 1.418,
    measuredCount: 10,
    totalTiming: 14.18,
    timestamp: now - 600000,
    notes: '疑似单位误写：50m不可能，应该是50cm。单位未确认。',
    sourceRef: '学生作业A组'
  },
  {
    id: 'rec-10',
    batchId: 'batch-anomaly',
    length: 1.000,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 5.0,
    angleUnit: 'deg',
    measuredPeriod: 2.005,
    measuredCount: 9,
    totalTiming: 20.05,
    timestamp: now - 500000,
    notes: '总计时20.05s对应约10个周期，但只计数了9个，疑似漏拍1次',
    sourceRef: '学生作业B组'
  },
  {
    id: 'rec-11',
    batchId: 'batch-anomaly',
    length: 750,
    lengthUnit: 'mm',
    lengthUnitConfirmed: false,
    angle: 25.0,
    angleUnit: 'deg',
    measuredPeriod: 1.752,
    measuredCount: 10,
    totalTiming: 17.52,
    timestamp: now - 400000,
    notes: '单位mm可能应为cm？750mm=0.75m理论合理。同时摆角25°需要大角度修正。',
    sourceRef: '学生作业C组'
  },
  {
    id: 'rec-12',
    batchId: 'batch-anomaly',
    length: 1.000,
    lengthUnit: 'm',
    lengthUnitConfirmed: true,
    angle: 5.0,
    angleUnit: 'deg',
    measuredPeriod: 2.228,
    measuredCount: 10,
    totalTiming: 22.28,
    timestamp: now - 300000,
    notes: '测量周期明显偏大（约+11%），可能多数了一个周期：22.28/11≈2.025s更合理',
    sourceRef: '学生作业D组'
  }
];

export const loadSampleData = () => {
  const existing = localStorage.getItem('pendulum-error-panel-state');
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.records && parsed.records.length > 0) {
        return null;
      }
    } catch (e) {
      // Proceed to load sample data
    }
  }

  const batches = createSampleBatches();
  const records = createSampleRecords();
  
  return { batches, records };
};
