import type {
  FrequencyBand,
  RoadNoiseSource,
  SoundBarrier,
  AcousticMaterial,
  ResidentPoint,
  ValidationError,
} from '@/types';
import { FREQUENCY_BANDS } from '@/types';

const generateId = (): string => `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const validateRoadNoiseSource = (source: RoadNoiseSource): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const band of FREQUENCY_BANDS) {
    if (source.spectrum[band] === null) {
      errors.push({
        id: generateId(),
        type: 'frequency_missing',
        severity: 'error',
        message: `道路噪声源"${source.name}"的频段${band}Hz数据缺失`,
        source: {
          fileName: source.sourceFile,
          lineNumber: source.sourceLine,
          frequencyBand: band,
          field: `spectrum.${band}`,
        },
        suggestion: `请补充"${source.sourceFile || '噪声源数据'}"第${source.sourceLine || '?'}行的${band}Hz声压级数据，参考范围：70-95 dB`,
      });
    } else if (source.spectrum[band]! < 40 || source.spectrum[band]! > 120) {
      errors.push({
        id: generateId(),
        type: 'value_out_of_range',
        severity: 'warning',
        message: `道路噪声源"${source.name}"的频段${band}Hz数值超出合理范围`,
        source: {
          fileName: source.sourceFile,
          lineNumber: source.sourceLine,
          frequencyBand: band,
          field: `spectrum.${band}`,
        },
        suggestion: `声压级应在40-120 dB范围内，当前值为${source.spectrum[band]} dB，请检查数据准确性`,
      });
    }
  }

  if (source.trafficVolume <= 0 || source.trafficVolume > 10000) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'error',
      message: `道路噪声源"${source.name}"的车流量超出合理范围`,
      source: {
        fileName: source.sourceFile,
        lineNumber: source.sourceLine,
        field: 'trafficVolume',
      },
      suggestion: `车流量应在0-10000辆/小时范围内，当前值为${source.trafficVolume}`,
    });
  }

  if (source.speedLimit < 20 || source.speedLimit > 150) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'warning',
      message: `道路噪声源"${source.name}"的限速超出合理范围`,
      source: {
        fileName: source.sourceFile,
        lineNumber: source.sourceLine,
        field: 'speedLimit',
      },
      suggestion: `限速应在20-150 km/h范围内，当前值为${source.speedLimit}`,
    });
  }

  if (source.heavyVehicleRatio < 0 || source.heavyVehicleRatio > 100) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'error',
      message: `道路噪声源"${source.name}"的重型车比例超出合理范围`,
      source: {
        fileName: source.sourceFile,
        lineNumber: source.sourceLine,
        field: 'heavyVehicleRatio',
      },
      suggestion: `重型车比例应在0-100%范围内，当前值为${source.heavyVehicleRatio}%`,
    });
  }

  return errors;
};

export const validateMaterial = (material: AcousticMaterial): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const band of FREQUENCY_BANDS) {
    if (material.transmissionLoss[band] === null) {
      errors.push({
        id: generateId(),
        type: 'frequency_missing',
        severity: 'error',
        message: `材料"${material.name}"的频段${band}Hz隔声量数据缺失`,
        source: {
          fileName: material.sourceFile,
          lineNumber: material.sourceLine,
          materialId: material.id,
          frequencyBand: band,
          field: `transmissionLoss.${band}`,
        },
        suggestion: `请补充"${material.sourceFile || '材料参数表'}"第${material.sourceLine || '?'}行的${band}Hz隔声量数据，参考范围：10-50 dB`,
      });
    } else if (material.transmissionLoss[band]! < 0 || material.transmissionLoss[band]! > 80) {
      errors.push({
        id: generateId(),
        type: 'value_out_of_range',
        severity: 'warning',
        message: `材料"${material.name}"的频段${band}Hz隔声量超出合理范围`,
        source: {
          fileName: material.sourceFile,
          lineNumber: material.sourceLine,
          materialId: material.id,
          frequencyBand: band,
          field: `transmissionLoss.${band}`,
        },
        suggestion: `隔声量应在0-80 dB范围内，当前值为${material.transmissionLoss[band]} dB`,
      });
    }

    if (material.absorptionCoefficient[band] === null) {
      errors.push({
        id: generateId(),
        type: 'frequency_missing',
        severity: 'warning',
        message: `材料"${material.name}"的频段${band}Hz吸声系数数据缺失`,
        source: {
          fileName: material.sourceFile,
          lineNumber: material.sourceLine,
          materialId: material.id,
          frequencyBand: band,
          field: `absorptionCoefficient.${band}`,
        },
        suggestion: `请补充"${material.sourceFile || '材料参数表'}"第${material.sourceLine || '?'}行的${band}Hz吸声系数数据，参考范围：0.05-0.95`,
      });
    } else if (
      material.absorptionCoefficient[band]! < 0 ||
      material.absorptionCoefficient[band]! > 1
    ) {
      errors.push({
        id: generateId(),
        type: 'value_out_of_range',
        severity: 'warning',
        message: `材料"${material.name}"的频段${band}Hz吸声系数超出合理范围`,
        source: {
          fileName: material.sourceFile,
          lineNumber: material.sourceLine,
          materialId: material.id,
          frequencyBand: band,
          field: `absorptionCoefficient.${band}`,
        },
        suggestion: `吸声系数应在0-1范围内，当前值为${material.absorptionCoefficient[band]}`,
      });
    }
  }

  return errors;
};

export const validateBarrier = (barrier: SoundBarrier, materials: AcousticMaterial[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (barrier.height <= 0 || barrier.height > 30) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'error',
      message: `隔音墙"${barrier.name}"的高度超出合理范围`,
      source: {
        field: 'height',
      },
      suggestion: `墙体高度应在0-30米范围内，当前值为${barrier.height}米`,
    });
  }

  if (barrier.length <= 0 || barrier.length > 5000) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'warning',
      message: `隔音墙"${barrier.name}"的长度超出合理范围`,
      source: {
        field: 'length',
      },
      suggestion: `墙体长度应在0-5000米范围内，当前值为${barrier.length}米`,
    });
  }

  if (barrier.distanceFromRoad < 0 || barrier.distanceFromRoad > 100) {
    errors.push({
      id: generateId(),
      type: 'value_out_of_range',
      severity: 'warning',
      message: `隔音墙"${barrier.name}"距道路距离超出合理范围`,
      source: {
        field: 'distanceFromRoad',
      },
      suggestion: `距道路距离应在0-100米范围内，当前值为${barrier.distanceFromRoad}米`,
    });
  }

  const materialExists = materials.some((m) => m.id === barrier.materialId);
  if (!materialExists) {
    errors.push({
      id: generateId(),
      type: 'alignment_error',
      severity: 'error',
      message: `隔音墙"${barrier.name}"引用的材料ID不存在`,
      source: {
        field: 'materialId',
      },
      suggestion: `材料ID"${barrier.materialId}"未找到，请在材料管理中添加该材料或重新选择`,
    });
  }

  return errors;
};

export const validateResidentPoints = (points: ResidentPoint[]): ValidationError[] => {
  const errors: ValidationError[] = [];
  const positionMap = new Map<string, ResidentPoint[]>();

  for (const point of points) {
    const key = `${point.position.lat.toFixed(4)}-${point.position.lng.toFixed(4)}`;
    const existing = positionMap.get(key) || [];
    positionMap.set(key, [...existing, point]);

    if (point.distanceFromRoad < 0 || point.distanceFromRoad > 500) {
      errors.push({
        id: generateId(),
        type: 'value_out_of_range',
        severity: 'warning',
        message: `居民点"${point.name}"距道路距离超出合理范围`,
        source: {
          residentPointId: point.id,
          field: 'distanceFromRoad',
        },
        suggestion: `距道路距离应在0-500米范围内，当前值为${point.distanceFromRoad}米`,
      });
    }

    if (point.receiverHeight < 0 || point.receiverHeight > 50) {
      errors.push({
        id: generateId(),
        type: 'value_out_of_range',
        severity: 'warning',
        message: `居民点"${point.name}"接收点高度超出合理范围`,
        source: {
          residentPointId: point.id,
          field: 'receiverHeight',
        },
        suggestion: `接收点高度应在0-50米范围内，当前值为${point.receiverHeight}米`,
      });
    }
  }

  for (const [, duplicates] of positionMap) {
    if (duplicates.length > 1) {
      const names = duplicates.map((d) => d.name).join('、');
      errors.push({
        id: generateId(),
        type: 'duplicate_point',
        severity: 'error',
        message: `检测到重复居民点：${names}`,
        source: {
          residentPointId: duplicates[0].id,
        },
        suggestion: `经纬度坐标(${duplicates[0].position.lat}, ${duplicates[0].position.lng})附近有${duplicates.length}个重复测点，请删除重复项或修正坐标`,
      });
    }
  }

  return errors;
};

export const validateDataAlignment = (
  sources: RoadNoiseSource[],
  materials: AcousticMaterial[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const band of FREQUENCY_BANDS) {
    const sourcesWithData = sources.filter((s) => s.spectrum[band] !== null);
    const materialsWithData = materials.filter((m) => m.transmissionLoss[band] !== null);

    if (sourcesWithData.length !== sources.length || materialsWithData.length !== materials.length) {
      errors.push({
        id: generateId(),
        type: 'alignment_error',
        severity: 'warning',
        message: `频段${band}Hz数据不完整，无法完全对齐`,
        source: {
          frequencyBand: band,
        },
        suggestion: `道路噪声源完整度：${sourcesWithData.length}/${sources.length}，材料参数完整度：${materialsWithData.length}/${materials.length}。请补充缺失数据以获得准确计算结果。`,
      });
    }
  }

  return errors;
};

export const validateAll = (
  sources: RoadNoiseSource[],
  barriers: SoundBarrier[],
  materials: AcousticMaterial[],
  residentPoints: ResidentPoint[]
): ValidationError[] => {
  const errors: ValidationError[] = [];

  for (const source of sources) {
    errors.push(...validateRoadNoiseSource(source));
  }

  for (const material of materials) {
    errors.push(...validateMaterial(material));
  }

  for (const barrier of barriers) {
    errors.push(...validateBarrier(barrier, materials));
  }

  errors.push(...validateResidentPoints(residentPoints));
  errors.push(...validateDataAlignment(sources, materials));

  return errors.sort((a, b) => {
    if (a.severity === 'error' && b.severity === 'warning') return -1;
    if (a.severity === 'warning' && b.severity === 'error') return 1;
    return 0;
  });
};

export const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    frequency_missing: '频段缺失',
    duplicate_point: '重复测点',
    material_incomplete: '材料不完整',
    alignment_error: '数据对齐错误',
    value_out_of_range: '数值超限',
    calculation_failed: '计算失败',
  };
  return labels[type] || type;
};

export const createMissingFrequencyScenario = (): {
  source: RoadNoiseSource;
  material: AcousticMaterial;
} => {
  const createNullSpectrum = (): Record<FrequencyBand, number | null> => {
    return FREQUENCY_BANDS.reduce((acc, band) => {
      acc[band] = Math.random() > 0.3 ? Math.round(70 + Math.random() * 20) : null;
      return acc;
    }, {} as Record<FrequencyBand, number | null>);
  };

  return {
    source: {
      id: 'demo-missing-source',
      name: '演示用-频段缺失道路',
      trafficVolume: 2000,
      speedLimit: 60,
      heavyVehicleRatio: 20,
      spectrum: createNullSpectrum(),
      sourceFile: '频段缺失演示数据.xlsx',
      sourceLine: 1,
    },
    material: {
      id: 'demo-missing-material',
      name: '演示用-频段缺失材料',
      sourceFile: '频段缺失演示数据.xlsx',
      sourceLine: 5,
      transmissionLoss: createNullSpectrum(),
      absorptionCoefficient: createNullSpectrum(),
    },
  };
};
