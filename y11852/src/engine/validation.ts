import { z } from 'zod';
import type {
  HallModel,
  SoundSource,
  Seat,
  ValidationResult,
  IssueType,
  Vec3,
  FrequencyBand,
} from '../types/acoustics';

const Vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const ImportMetaSchema = z.object({
  batch: z.number().int().positive(),
  timestamp: z.number().int().positive(),
  fileName: z.string().min(1),
});

const MaterialAssignmentSchema = z.object({
  meshName: z.string().min(1),
  materialId: z.string().nullable(),
});

const HallModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  importMeta: ImportMetaSchema,
  materials: z.array(MaterialAssignmentSchema),
  bounds: z.object({
    min: Vec3Schema,
    max: Vec3Schema,
  }),
  geometryData: z.string().optional(),
});

const SoundSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: Vec3Schema,
  frequency: z.enum(['low', 'mid', 'high']),
  power: z.number().min(0).max(140),
  directivity: z.enum(['omnidirectional', 'cardioid', 'line']),
});

const SeatAcousticsSchema = z.object({
  rt60: z.number().nullable(),
  spl: z.number().nullable(),
  c80: z.number().nullable(),
  hasError: z.boolean(),
  errorType: z.enum(['material_missing', 'seat_occluded', 'frequency_error']).optional(),
});

const SeatSchema = z.object({
  id: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  position: Vec3Schema,
  isOccluded: z.boolean(),
  issues: z.array(z.enum(['material_missing', 'seat_occluded', 'frequency_error'])),
  acoustics: z.object({
    low: SeatAcousticsSchema,
    mid: SeatAcousticsSchema,
    high: SeatAcousticsSchema,
  }),
});

export const validateHallModel = (data: unknown): { data: HallModel | null; issues: ValidationResult['issues'] } => {
  const result = HallModelSchema.safeParse(data);
  const issues: ValidationResult['issues'] = [];

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      issues.push({
        type: 'frequency_error',
        message: `厅堂模型格式错误: ${issue.path.join('.')} - ${issue.message}`,
      });
    });
    return { data: null, issues };
  }

  const model = result.data;

  model.materials.forEach((mat) => {
    if (mat.materialId === null) {
      issues.push({
        type: 'material_missing',
        message: `网格 "${mat.meshName}" 缺少材料参数分配`,
        relatedId: mat.meshName,
      });
    }
  });

  return { data: model as HallModel, issues };
};

export const validateSoundSources = (data: unknown): { data: SoundSource[]; issues: ValidationResult['issues'] } => {
  const schema = z.array(SoundSourceSchema);
  const result = schema.safeParse(data);
  const issues: ValidationResult['issues'] = [];

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      issues.push({
        type: 'frequency_error',
        message: `声源数据格式错误: ${issue.path.join('.')} - ${issue.message}`,
      });
    });
    return { data: [], issues };
  }

  const sources = result.data;

  sources.forEach((source) => {
    if (source.power < 60 || source.power > 120) {
      issues.push({
        type: 'frequency_error',
        message: `声源 "${source.name}" 功率 ${source.power}dB 超出合理范围(60-120dB)`,
        relatedId: source.id,
      });
    }
  });

  const ids = new Set<string>();
  sources.forEach((s) => {
    if (ids.has(s.id)) {
      issues.push({
        type: 'frequency_error',
        message: `声源ID重复: ${s.id}`,
        relatedId: s.id,
      });
    }
    ids.add(s.id);
  });

  return { data: sources as SoundSource[], issues };
};

export const validateSeats = (data: unknown): { data: Seat[]; issues: ValidationResult['issues'] } => {
  const schema = z.array(SeatSchema);
  const result = schema.safeParse(data);
  const issues: ValidationResult['issues'] = [];

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      issues.push({
        type: 'frequency_error',
        message: `座位数据格式错误: ${issue.path.join('.')} - ${issue.message}`,
      });
    });
    return { data: [], issues };
  }

  const seats = result.data;

  seats.forEach((seat) => {
    (['low', 'mid', 'high'] as FrequencyBand[]).forEach((band) => {
      const ac = seat.acoustics[band];
      if (ac.rt60 !== null && (ac.rt60 < 0.1 || ac.rt60 > 10)) {
        issues.push({
          type: 'frequency_error',
          message: `座位 ${seat.row}-${seat.col} ${band}频段 RT60 ${ac.rt60}s 超出合理范围`,
          relatedId: seat.id,
        });
      }
      if (ac.spl !== null && (ac.spl < 20 || ac.spl > 130)) {
        issues.push({
          type: 'frequency_error',
          message: `座位 ${seat.row}-${seat.col} ${band}频段 SPL ${ac.spl}dB 超出合理范围`,
          relatedId: seat.id,
        });
      }
    });
  });

  const ids = new Set<string>();
  seats.forEach((s) => {
    if (ids.has(s.id)) {
      issues.push({
        type: 'frequency_error',
        message: `座位ID重复: ${s.id}`,
        relatedId: s.id,
      });
    }
    ids.add(s.id);
  });

  return { data: seats as Seat[], issues };
};

export const validateAllData = (
  hall: HallModel | null,
  sources: SoundSource[],
  seats: Seat[]
): ValidationResult => {
  const allIssues: ValidationResult['issues'] = [];

  if (!hall) {
    allIssues.push({
      type: 'material_missing',
      message: '缺少厅堂模型数据',
    });
  }

  if (sources.length === 0) {
    allIssues.push({
      type: 'frequency_error',
      message: '缺少声源数据',
    });
  }

  if (seats.length === 0) {
    allIssues.push({
      type: 'frequency_error',
      message: '缺少座位数据',
    });
  }

  const missingMaterials = hall?.materials.filter((m) => m.materialId === null) || [];
  if (missingMaterials.length > 0) {
    allIssues.push({
      type: 'material_missing',
      message: `${missingMaterials.length} 个网格缺少材料参数，计算结果可能不准确`,
    });
  }

  const occludedSeats = seats.filter((s) => s.isOccluded);
  if (occludedSeats.length > 0) {
    allIssues.push({
      type: 'seat_occluded',
      message: `${occludedSeats.length} 个座位存在视线遮挡`,
    });
  }

  return {
    isValid: allIssues.length === 0,
    issues: allIssues,
  };
};

export const createSeatFromPosition = (
  pos: Vec3,
  row: number,
  col: number,
  hasOcclusion: boolean = false
): Seat => {
  const baseRt60 = 1.2 + Math.random() * 0.8;
  const baseSpl = 85 + (Math.random() - 0.5) * 10;

  const issues: IssueType[] = [];
  if (hasOcclusion) issues.push('seat_occluded');

  const createAcoustics = (band: FrequencyBand) => {
    const bandMultiplier = band === 'low' ? 1.3 : band === 'high' ? 0.8 : 1;
    const hasError = Math.random() < 0.03;

    return {
      rt60: baseRt60 * bandMultiplier + (Math.random() - 0.5) * 0.3,
      spl: baseSpl + (Math.random() - 0.5) * 5,
      c80: 2 + Math.random() * 8,
      hasError,
      errorType: hasError ? ('frequency_error' as IssueType) : undefined,
    };
  };

  return {
    id: `seat_${row}_${col}`,
    row,
    col,
    position: pos,
    isOccluded: hasOcclusion,
    issues,
    acoustics: {
      low: createAcoustics('low'),
      mid: createAcoustics('mid'),
      high: createAcoustics('high'),
    },
  };
};
