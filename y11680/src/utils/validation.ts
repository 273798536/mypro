import type {
  RoomConfig,
  SoundSource,
  AcousticMaterial,
  MeasurementPoint,
  ValidationError,
} from '../types';
import { standardFrequencies } from '../data/defaultMaterials';

const MIN_ROOM_DIMENSION = 0.5;
const MAX_ROOM_DIMENSION = 50;
const MIN_FREQUENCY = 20;
const MAX_FREQUENCY = 20000;

export function validateRoomConfig(room: RoomConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  const dimensions = [
    { name: '宽度', value: room.width },
    { name: '高度', value: room.height },
    { name: '深度', value: room.depth },
  ];

  for (const dim of dimensions) {
    if (dim.value < MIN_ROOM_DIMENSION || dim.value > MAX_ROOM_DIMENSION) {
      errors.push({
        type: 'parameter',
        severity: 'warning',
        message: `房间${dim.name}(${dim.value}m)超出建议范围`,
        suggestion: `建议${dim.name}设置在 ${MIN_ROOM_DIMENSION}m - ${MAX_ROOM_DIMENSION}m 之间`,
        affectedField: `room.${dim.name}`,
      });
    }
  }

  const ratioWH = room.width / room.height;
  const ratioWD = room.width / room.depth;
  if (Math.abs(ratioWH - 1) < 0.1 || Math.abs(ratioWD - 1) < 0.1) {
    errors.push({
      type: 'parameter',
      severity: 'warning',
      message: '房间尺寸比例接近1:1，可能产生强烈驻波',
      suggestion: '建议房间长宽高比例避免整数比，推荐使用黄金比例或玻尔兹曼比例',
      affectedField: 'room.dimensions',
    });
  }

  return errors;
}

export function validateSoundSource(
  source: SoundSource,
  room: RoomConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (source.frequency < MIN_FREQUENCY || source.frequency > MAX_FREQUENCY) {
    errors.push({
      type: 'frequency',
      severity: 'error',
      message: `频率 ${source.frequency}Hz 超出人耳可听范围`,
      suggestion: `请设置频率在 ${MIN_FREQUENCY}Hz - ${MAX_FREQUENCY}Hz 之间`,
      affectedField: 'soundSource.frequency',
    });
  }

  if (source.frequency < 60) {
    errors.push({
      type: 'frequency',
      severity: 'warning',
      message: `低频 ${source.frequency}Hz 计算精度有限`,
      suggestion: '对于极低频，建议使用更专业的声学模拟软件',
      affectedField: 'soundSource.frequency',
    });
  }

  const positionErrors = [
    { name: 'X', value: source.x, max: room.width },
    { name: 'Y', value: source.y, max: room.height },
    { name: 'Z', value: source.z, max: room.depth },
  ];

  for (const pos of positionErrors) {
    if (pos.value < 0 || pos.value > pos.max) {
      errors.push({
        type: 'position',
        severity: 'error',
        message: `声源${pos.name}坐标 ${pos.value}m 超出房间范围`,
        suggestion: `声源${pos.name}坐标应在 0 - ${pos.max}m 之间`,
        affectedField: `soundSource.${pos.name.toLowerCase()}`,
      });
    }
  }

  return errors;
}

export function validateMeasurementPoint(
  point: MeasurementPoint,
  room: RoomConfig
): ValidationError[] {
  const errors: ValidationError[] = [];

  const positions = [
    { name: 'X', value: point.x, max: room.width },
    { name: 'Y', value: point.y, max: room.height },
    { name: 'Z', value: point.z, max: room.depth },
  ];

  for (const pos of positions) {
    if (pos.value < 0 || pos.value > pos.max) {
      errors.push({
        type: 'position',
        severity: 'error',
        message: `测点 "${point.name}" ${pos.name}坐标超出房间范围`,
        suggestion: `测点${pos.name}坐标应在 0 - ${pos.max}m 之间`,
        affectedField: `measurementPoint.${point.id}.${pos.name.toLowerCase()}`,
      });
    }
  }

  return errors;
}

export function validateAcousticMaterial(material: AcousticMaterial): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!material.name || material.name.trim().length === 0) {
    errors.push({
      type: 'material',
      severity: 'error',
      message: '材料名称不能为空',
      suggestion: '请输入材料名称',
      affectedField: `material.${material.id}.name`,
    });
  }

  const coeffs = material.absorptionCoefficient;
  const hasValidCoeffs = standardFrequencies.some((freq) => coeffs[freq] !== undefined);

  if (!hasValidCoeffs) {
    errors.push({
      type: 'material',
      severity: 'error',
      message: `材料 "${material.name}" 缺少吸声系数数据`,
      suggestion: `请至少提供一个标准频段的吸声系数: ${standardFrequencies.join(', ')} Hz`,
      affectedField: `material.${material.id}.absorptionCoefficient`,
    });
  }

  for (const freq of standardFrequencies) {
    if (coeffs[freq] !== undefined) {
      if (coeffs[freq] < 0 || coeffs[freq] > 1) {
        errors.push({
          type: 'material',
          severity: 'error',
          message: `材料 "${material.name}" ${freq}Hz 吸声系数 ${coeffs[freq]} 超出有效范围`,
          suggestion: '吸声系数应在 0 - 1 之间',
          affectedField: `material.${material.id}.absorptionCoefficient.${freq}`,
        });
      }
    }
  }

  return errors;
}

export function validateAll(
  room: RoomConfig,
  source: SoundSource,
  materials: AcousticMaterial[],
  measurementPoints: MeasurementPoint[]
): ValidationError[] {
  const allErrors: ValidationError[] = [];

  allErrors.push(...validateRoomConfig(room));
  allErrors.push(...validateSoundSource(source, room));

  for (const material of materials) {
    allErrors.push(...validateAcousticMaterial(material));
  }

  for (const point of measurementPoints) {
    allErrors.push(...validateMeasurementPoint(point, room));
  }

  return allErrors;
}

export function hasCriticalErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error');
}

export function groupErrorsByType(errors: ValidationError[]): Record<string, ValidationError[]> {
  return errors.reduce((groups, error) => {
    if (!groups[error.type]) {
      groups[error.type] = [];
    }
    groups[error.type].push(error);
    return groups;
  }, {} as Record<string, ValidationError[]>);
}
