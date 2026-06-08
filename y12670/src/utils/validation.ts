import { MeasurementRecord, ValidationError, SliceData } from '@/types';

const SUPPORTED_UNITS = ['m', 'cm', 'mm', 'ft', 'in'];
const UNIT_CONVERSION_FACTORS: Record<string, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

const DEFAULT_VALUE_RANGE = { min: 0, max: 1 };
const TYPICAL_DEPTH_RANGE = { min: 0, max: 500 };

export const validateMeasurement = (
  data: Partial<MeasurementRecord>
): { valid: boolean; errors: ValidationError[] } => {
  const errors: ValidationError[] = [];

  if (!data.name || data.name.trim() === '') {
    errors.push({
      message: '缺少记录名称',
      suggestion: '请填写检测记录的名称，建议包含日期和检测区域，如"2024-01-15 坝体检测A区"',
      field: 'name',
      severity: 'error',
    });
  }

  if (!data.timestamp) {
    errors.push({
      message: '缺少时间参数',
      suggestion: '请补充检测日期和时间，格式建议为 ISO 8601（如 2024-01-15T10:30:00Z）',
      field: 'timestamp',
      severity: 'error',
    });
  } else {
    const ts = new Date(data.timestamp);
    if (isNaN(ts.getTime())) {
      errors.push({
        message: `时间参数格式无效: "${data.timestamp}"`,
        suggestion: '请使用标准日期格式，如 YYYY-MM-DD 或 ISO 8601',
        field: 'timestamp',
        severity: 'error',
      });
    }
  }

  if (!data.unit || data.unit.trim() === '') {
    errors.push({
      message: '缺少单位信息',
      suggestion: `请指定深度单位，支持的单位有：${SUPPORTED_UNITS.join('、')}`,
      field: 'unit',
      severity: 'error',
    });
  } else if (!SUPPORTED_UNITS.includes(data.unit)) {
    errors.push({
      message: `单位 "${data.unit}" 不被支持`,
      suggestion: `请将单位转换为以下之一：${SUPPORTED_UNITS.join('、')}，当前值将以米(m)估算`,
      field: 'unit',
      severity: 'warning',
    });
  }

  if (!data.slices || data.slices.length === 0) {
    errors.push({
      message: '缺少切片数据',
      suggestion: '请至少导入一组核磁共振切片数据',
      field: 'slices',
      severity: 'error',
    });
  } else {
    data.slices.forEach((slice, index) => {
      errors.push(...validateSlice(slice, index, data.unit, data.expectedValueRange));
    });

    const unitMismatches = checkSliceUnitConsistency(data.slices);
    if (unitMismatches.length > 0) {
      errors.push({
        message: `切片单位不一致：发现 ${unitMismatches.length} 个切片使用了不同单位`,
        suggestion: `请统一所有切片的深度单位，建议使用与记录一致的 "${data.unit || 'm'}"`,
        field: 'slices.unit',
        severity: 'warning',
      });
    }

    const depthIssues = checkDepthContinuity(data.slices, data.unit);
    depthIssues.forEach((issue) => errors.push(issue));
  }

  const outOfBounds = checkValueOutOfBounds(data.slices, data.expectedValueRange || DEFAULT_VALUE_RANGE);
  if (outOfBounds.totalCount > 0) {
    errors.push({
      message: `检测到 ${outOfBounds.totalCount} 个数值超出正常范围 [${data.expectedValueRange?.min ?? 0}, ${data.expectedValueRange?.max ?? 1}]`,
      suggestion: '请检查数据采集设备是否校准正常，异常值可能影响分析结果准确性',
      field: 'slices.data',
      severity: 'warning',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
};

const validateSlice = (
  slice: SliceData,
  index: number,
  recordUnit?: string,
  expectedRange?: { min: number; max: number }
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (slice.depth === undefined || slice.depth === null) {
    errors.push({
      message: `第 ${index + 1} 个切片缺少深度信息`,
      suggestion: `请补充该切片的深度数值，单位应为 ${recordUnit || 'm'}`,
      field: `slices[${index}].depth`,
      severity: 'error',
    });
  } else {
    const depthInMeters = slice.depth * (UNIT_CONVERSION_FACTORS[slice.depthUnit || recordUnit || 'm'] || 1);
    if (depthInMeters < TYPICAL_DEPTH_RANGE.min || depthInMeters > TYPICAL_DEPTH_RANGE.max) {
      errors.push({
        message: `第 ${index + 1} 个切片深度 ${slice.depth}${slice.depthUnit || recordUnit || 'm'} 超出常规范围 [${TYPICAL_DEPTH_RANGE.min}m, ${TYPICAL_DEPTH_RANGE.max}m]`,
        suggestion: '请确认深度数值是否正确，若为特殊工况请忽略此提示',
        field: `slices[${index}].depth`,
        severity: 'warning',
      });
    }
  }

  if (!slice.data || slice.data.length === 0) {
    errors.push({
      message: `第 ${index + 1} 个切片缺少数据`,
      suggestion: '请确保该切片包含完整的核磁共振数据矩阵',
      field: `slices[${index}].data`,
      severity: 'error',
    });
  } else {
    const rowLength = slice.data[0]?.length || 0;
    const hasUnevenRows = slice.data.some((row) => row.length !== rowLength);
    if (hasUnevenRows) {
      errors.push({
        message: `第 ${index + 1} 个切片数据矩阵行宽不一致`,
        suggestion: '请检查数据格式，确保所有行的列数相同',
        field: `slices[${index}].data`,
        severity: 'error',
      });
    }

    const range = expectedRange || DEFAULT_VALUE_RANGE;
    let outOfBounds = 0;
    slice.data.forEach((row) => {
      row.forEach((val) => {
        if (typeof val !== 'number' || isNaN(val)) {
          outOfBounds++;
        } else if (val < range.min || val > range.max) {
          outOfBounds++;
        }
      });
    });
    if (outOfBounds > 0) {
      errors.push({
        message: `第 ${index + 1} 个切片有 ${outOfBounds} 个数值超出范围 [${range.min}, ${range.max}]`,
        suggestion: '请检查数据采集是否正常，或调整期望值范围设置',
        field: `slices[${index}].data`,
        severity: 'warning',
      });
    }
  }

  return errors;
};

const checkSliceUnitConsistency = (slices: SliceData[]): SliceData[] => {
  const units = new Set(slices.map((s) => s.depthUnit).filter(Boolean));
  if (units.size <= 1) return [];
  return slices.filter((s) => s.depthUnit && s.depthUnit !== [...units][0]);
};

const checkDepthContinuity = (slices: SliceData[], recordUnit?: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (slices.length < 2) return errors;

  const sorted = [...slices].sort((a, b) => a.depth - b.depth);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i].depth - sorted[i - 1].depth);
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  intervals.forEach((interval, i) => {
    if (avgInterval > 0 && Math.abs(interval - avgInterval) / avgInterval > 0.5) {
      errors.push({
        message: `切片深度间距不均匀：第 ${i + 1} 个与第 ${i + 2} 个切片间距 ${interval.toFixed(3)}${recordUnit || 'm'} 偏离平均值 ${avgInterval.toFixed(3)}${recordUnit || 'm'}`,
        suggestion: '请确认切片采样间距是否一致，不均匀间距可能影响三维重建质量',
        field: `slices[${sorted[i].index}].depth`,
        severity: 'warning',
      });
    }
  });

  return errors;
};

const checkValueOutOfBounds = (
  slices: SliceData[],
  range: { min: number; max: number }
): { totalCount: number; bySlice: number[] } => {
  let totalCount = 0;
  const bySlice: number[] = [];

  slices.forEach((slice) => {
    let count = 0;
    slice.data?.forEach((row) => {
      row.forEach((val) => {
        if (typeof val !== 'number' || isNaN(val) || val < range.min || val > range.max) {
          count++;
        }
      });
    });
    bySlice.push(count);
    totalCount += count;
  });

  return { totalCount, bySlice };
};

export const computeImportHash = (record: Partial<MeasurementRecord>): string => {
  const key = `${record.name}|${record.timestamp}|${record.slices?.length || 0}|${JSON.stringify(record.slices?.[0]?.data?.[0]?.slice(0, 3) || [])}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `import-${Math.abs(hash).toString(36)}`;
};

export const checkDuplicate = (
  newRecord: MeasurementRecord,
  existingRecords: MeasurementRecord[]
): { isDuplicate: boolean; reason?: string } => {
  if (newRecord.importHash) {
    const hashMatch = existingRecords.find((r) => r.importHash === newRecord.importHash);
    if (hashMatch) {
      return {
        isDuplicate: true,
        reason: `与已有记录 "${hashMatch.name}" 数据完全相同（导入哈希一致）`,
      };
    }
  }

  const exactMatch = existingRecords.find(
    (record) =>
      record.name === newRecord.name &&
      record.timestamp === newRecord.timestamp &&
      record.slices.length === newRecord.slices.length
  );

  if (exactMatch) {
    return {
      isDuplicate: true,
      reason: `存在同名同时长的记录 "${exactMatch.name}"，疑似重复导入`,
    };
  }

  return { isDuplicate: false };
};

export const parseImportFile = async (file: File): Promise<{
  success: boolean;
  data?: Partial<MeasurementRecord>[];
  errors: ValidationError[];
}> => {
  const errors: ValidationError[] = [];

  try {
    const text = await file.text();
    let parsed: any;

    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false,
        errors: [
          {
            message: `文件 "${file.name}" 不是有效的 JSON 格式`,
            suggestion: '请检查文件内容，确保为标准 JSON 格式，可使用 JSON 校验工具验证',
            field: 'file',
            severity: 'error',
          },
        ],
      };
    }

    const records: Partial<MeasurementRecord>[] = [];

    if (Array.isArray(parsed)) {
      parsed.forEach((item, idx) => {
        const normalized = normalizeRecord(item, idx);
        if (normalized) records.push(normalized);
      });
    } else if (parsed && typeof parsed === 'object') {
      const normalized = normalizeRecord(parsed, 0);
      if (normalized) records.push(normalized);
    }

    if (records.length === 0) {
      errors.push({
        message: '未解析到有效的测量记录',
        suggestion: '请确保 JSON 数据包含记录所需字段：name、timestamp、slices',
        field: 'file',
        severity: 'error',
      });
    }

    return {
      success: errors.filter((e) => e.severity === 'error').length === 0 && records.length > 0,
      data: records,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      errors: [
        {
          message: `读取文件 "${file.name}" 失败: ${(err as Error).message}`,
          suggestion: '请确认文件未损坏，且您有读取该文件的权限',
          field: 'file',
          severity: 'error',
        },
      ],
    };
  }
};

const normalizeRecord = (item: any, index: number): Partial<MeasurementRecord> | null => {
  if (!item || typeof item !== 'object') return null;

  const slices: SliceData[] = [];
  if (Array.isArray(item.slices)) {
    item.slices.forEach((s: any, i: number) => {
      if (s && Array.isArray(s.data)) {
        slices.push({
          id: s.id || `slice-${index}-${i}`,
          index: s.index ?? i,
          depth: typeof s.depth === 'number' ? s.depth : i * 0.5,
          depthUnit: s.depthUnit || s.unit,
          data: s.data,
        });
      }
    });
  }

  return {
    id: item.id || `record-import-${Date.now()}-${index}`,
    name: item.name || item.title || `导入记录 ${index + 1}`,
    timestamp: item.timestamp || item.date || item.time || new Date().toISOString(),
    unit: item.unit || item.depthUnit || 'm',
    slices,
    metadata: item.metadata || item.meta || {},
    expectedValueRange: item.expectedValueRange || item.valueRange,
  };
};
