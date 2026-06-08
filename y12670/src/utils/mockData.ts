import { MeasurementRecord, ValidationError } from '@/types';

const generateSliceData = (size: number = 32, outOfBounds: boolean = false): number[][] => {
  const data: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const centerX = size / 2;
      const centerY = size / 2;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      let value = Math.max(0, 1 - distance / (size / 2)) * (0.5 + Math.random() * 0.5);
      if (outOfBounds && Math.random() > 0.95) {
        value = 1.2 + Math.random() * 0.3;
      }
      row.push(value);
    }
    data.push(row);
  }
  return data;
};

export const generateMockRecord = (
  id: string,
  name: string,
  hasErrors: boolean = false
): MeasurementRecord => {
  const sliceCount = 8;
  const slices = Array.from({ length: sliceCount }, (_, i) => ({
    id: `${id}-slice-${i}`,
    index: i,
    depth: i * 0.5,
    depthUnit: 'm',
    data: generateSliceData(32, hasErrors && Math.random() > 0.7),
  }));

  const errors: ValidationError[] = [];
  let status: 'valid' | 'invalid' | 'review' = 'valid';

  if (hasErrors) {
    const errorType = Math.random();
    if (errorType > 0.6) {
      errors.push({
        message: '缺少时间参数',
        suggestion: '请补充检测日期和时间，格式建议为 ISO 8601（如 2024-01-15T10:30:00Z）',
        field: 'timestamp',
        severity: 'error',
      });
      status = 'invalid';
    }
    if (errorType > 0.3) {
      errors.push({
        message: '单位换算存在疑问，建议复核',
        suggestion: '请确认切片深度单位是否统一，建议全部转换为米(m)',
        field: 'unit',
        severity: 'warning',
      });
      if (status !== 'invalid') status = 'review';
    }
    if (errorType > 0.5) {
      errors.push({
        message: '检测到部分数值超出正常范围 [0, 1]',
        suggestion: '请检查数据采集设备是否校准正常，异常值可能影响分析结果准确性',
        field: 'slices.data',
        severity: 'warning',
      });
      if (status !== 'invalid') status = 'review';
    }
  }

  return {
    id,
    name,
    timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status,
    errors,
    slices,
    unit: 'm',
    expectedValueRange: { min: 0, max: 1 },
    metadata: {
      location: `站点 ${Math.floor(Math.random() * 10) + 1}`,
      operator: `工程师 ${Math.floor(Math.random() * 5) + 1}`,
    },
    importHash: `mock-${id}`,
  };
};

export const getInitialRecords = (): MeasurementRecord[] => {
  return [
    generateMockRecord('record-1', '2024-01-15 坝体检测 A 区'),
    generateMockRecord('record-2', '2024-01-20 坝体检测 B 区', true),
    generateMockRecord('record-3', '2024-02-01 基础区域检测'),
    generateMockRecord('record-4', '2024-02-10 边坡监测点 1', true),
    generateMockRecord('record-5', '2024-02-20 边坡监测点 2'),
  ];
};

export const generateSampleImportJSON = (): string => {
  const record = generateMockRecord('sample-import', '示例导入数据 - 坝基检测点 C3');
  return JSON.stringify([record], null, 2);
};
