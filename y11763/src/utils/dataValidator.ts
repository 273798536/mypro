import { Particle, ValidationError, ParticleType, Vector3Data } from '../types/particle';

const VALID_PARTICLE_TYPES: ParticleType[] = ['electron', 'proton', 'neutron', 'muon', 'pion', 'kaon'];
const TRAJECTORY_BREAK_THRESHOLD = 2.0;
const MIN_TRAJECTORY_POINTS = 5;

export function validateParticle(particle: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = particle as Partial<Particle>;

  if (!p.id) {
    errors.push({
      type: 'missing_field',
      message: '粒子ID缺失',
      severity: 'error',
    });
    return errors;
  }

  if (!p.type || !VALID_PARTICLE_TYPES.includes(p.type)) {
    errors.push({
      type: 'wrong_label',
      particleId: p.id,
      message: `无效的粒子类型: ${p.type || 'undefined'}`,
      severity: 'error',
    });
  }

  if (p.charge === undefined || p.charge === null) {
    errors.push({
      type: 'missing_field',
      particleId: p.id,
      message: '粒子电荷缺失',
      severity: 'warning',
    });
  }

  if (!p.trajectoryPoints || p.trajectoryPoints.length < MIN_TRAJECTORY_POINTS) {
    errors.push({
      type: 'trajectory_break',
      particleId: p.id,
      message: `轨迹点数量不足: ${p.trajectoryPoints?.length || 0}，最少需要${MIN_TRAJECTORY_POINTS}个点`,
      severity: 'error',
    });
    return errors;
  }

  const breakErrors = detectTrajectoryBreaks(p.trajectoryPoints, p.id);
  errors.push(...breakErrors);

  return errors;
}

export function detectTrajectoryBreaks(
  points: Vector3Data[],
  particleId: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const distance = Math.sqrt(
      (curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2 + (curr.z - prev.z) ** 2
    );

    if (distance > TRAJECTORY_BREAK_THRESHOLD) {
      errors.push({
        type: 'trajectory_break',
        particleId,
        message: `轨迹在点 ${i - 1} 和 ${i} 之间断裂，间距: ${distance.toFixed(2)}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}

export function validateMagneticFieldDirection(direction: Vector3Data): ValidationError | null {
  const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
  
  if (length === 0) {
    return {
      type: 'field_direction',
      message: '磁场方向向量不能为零向量',
      severity: 'error',
    };
  }

  if (Math.abs(length - 1.0) > 0.01) {
    return {
      type: 'field_direction',
      message: `磁场方向向量未归一化，当前长度: ${length.toFixed(4)}`,
      severity: 'warning',
    };
  }

  return null;
}

export function validateImportData(data: unknown): { valid: Particle[]; errors: ValidationError[] } {
  const valid: Particle[] = [];
  const allErrors: ValidationError[] = [];

  if (!Array.isArray(data)) {
    return {
      valid: [],
      errors: [
        {
          type: 'missing_field',
          message: '导入数据格式错误，应为数组',
          severity: 'error',
        },
      ],
    };
  }

  data.forEach((item, index) => {
    const errors = validateParticle(item);
    if (errors.length === 0 || errors.every((e) => e.severity === 'warning')) {
      valid.push(item as Particle);
    }
    allErrors.push(...errors);
  });

  return { valid, errors: allErrors };
}
