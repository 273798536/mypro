import { MaterialBatch, RadiationReading } from '../types';

export const seedBatches: Omit<MaterialBatch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    batchNo: 'BAT-2024-001',
    materialType: '不锈钢304',
    defaultEmissivity: 0.85,
    description: '奥氏体不锈钢，常规热处理用',
  },
  {
    batchNo: 'BAT-2024-002',
    materialType: '铝合金6061',
    defaultEmissivity: 0.12,
    description: '6000系铝合金，固溶处理用',
  },
  {
    batchNo: 'BAT-2024-003',
    materialType: '陶瓷氧化铝',
    defaultEmissivity: 0.93,
    description: '高纯度氧化铝陶瓷，高温烧结用',
  },
];

const baseTime = new Date('2024-06-01T08:00:00');
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

export const seedReadings: Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 0),
    radiationValue: 45000,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 10),
    radiationValue: 46200,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 20),
    radiationValue: 47100,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 26,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-002',
    readingTime: addMinutes(baseTime, 0),
    radiationValue: 12500,
    materialBatchId: '',
    emissivity: 0.12,
    ambientTemp: 24,
    isLateSupplement: false,
    remark: '铝合金批次，低发射率',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-002',
    readingTime: addMinutes(baseTime, 10),
    radiationValue: 13200,
    materialBatchId: '',
    emissivity: 0.12,
    ambientTemp: 24,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-003',
    readingTime: addMinutes(baseTime, 0),
    radiationValue: 78000,
    materialBatchId: '',
    emissivity: 0.93,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '陶瓷批次，高发射率',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-003',
    readingTime: addMinutes(baseTime, 10),
    radiationValue: 79500,
    materialBatchId: '',
    emissivity: 0.93,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 30),
    radiationValue: 48000,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 26,
    isLateSupplement: false,
    remark: '正常记录',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 40),
    radiationValue: 49500,
    materialBatchId: '',
    emissivity: null,
    ambientTemp: 27,
    isLateSupplement: false,
    remark: '发射率缺失，使用批次默认值',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-002',
    readingTime: addMinutes(baseTime, 20),
    radiationValue: 14000,
    materialBatchId: '',
    emissivity: null,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '发射率缺失',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 50),
    radiationValue: 0,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 27,
    isLateSupplement: false,
    remark: '辐射读数缺失',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-003',
    readingTime: addMinutes(baseTime, 20),
    radiationValue: 81000,
    materialBatchId: '',
    emissivity: 0.93,
    ambientTemp: 26,
    isLateSupplement: false,
    remark: '缺批次信息',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 60),
    radiationValue: 51000,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 28,
    isLateSupplement: true,
    remark: '晚补记录，数据滞后1小时',
    remarkModifiedAt: null,
  },
  {
    sensorId: 'SENSOR-002',
    readingTime: addMinutes(baseTime, 30),
    radiationValue: 14800,
    materialBatchId: '',
    emissivity: 0.12,
    ambientTemp: 25,
    isLateSupplement: false,
    remark: '备注已修改：温度偏高，需复核',
    remarkModifiedAt: addMinutes(baseTime, 35),
  },
  {
    sensorId: 'SENSOR-001',
    readingTime: addMinutes(baseTime, 70),
    radiationValue: 65000,
    materialBatchId: '',
    emissivity: 0.85,
    ambientTemp: 28,
    isLateSupplement: false,
    remark: '传感器漂移检测标记',
    remarkModifiedAt: null,
  },
];

export const generateDriftReadings = (
  batchId: string,
  count: number = 30
): Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const readings: Omit<RadiationReading, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const startTime = addMinutes(baseTime, -300);

  for (let i = 0; i < count; i++) {
    const baseValue = 45000;
    const noise = (Math.random() - 0.5) * 2000;
    const drift = i > count - 8 ? (i - (count - 8)) * 2500 : 0;

    readings.push({
      sensorId: 'SENSOR-001',
      readingTime: addMinutes(startTime, i * 10),
      radiationValue: Math.round(baseValue + noise + drift),
      materialBatchId: batchId,
      emissivity: 0.85,
      ambientTemp: 25 + Math.floor(Math.random() * 3),
      isLateSupplement: false,
      remark: i >= count - 1 ? '传感器漂移异常' : '历史校准数据',
      remarkModifiedAt: null,
    });
  }

  return readings;
};
