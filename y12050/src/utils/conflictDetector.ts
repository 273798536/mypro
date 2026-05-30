import type { ScanParams, ParamConflict, Level, ImageQuality } from '@/types';

export function checkConflicts(params: ScanParams, _level: Level): ParamConflict[] {
  const conflicts: ParamConflict[] = [];

  if (params.TR <= params.TE) {
    conflicts.push({
      params: ['TR', 'TE'],
      message: `重复时间(TR=${params.TR}ms)必须大于回波时间(TE=${params.TE}ms)`,
      severity: 'fatal',
    });
  }

  if (params.TR < 2 * params.TE) {
    conflicts.push({
      params: ['TR', 'TE'],
      message: `TR过小(TR=${params.TR}ms)，无法完成质子弛豫(需≥${2 * params.TE}ms)`,
      severity: 'error',
    });
  }

  if (params.sliceThickness > params.FOV / 2) {
    conflicts.push({
      params: ['sliceThickness', 'FOV'],
      message: `层厚(${params.sliceThickness}mm)过大，超过视野范围(FOV=${params.FOV}cm)的一半`,
      severity: 'error',
    });
  }

  if (params.matrix > 512 && params.NEX > 4) {
    conflicts.push({
      params: ['matrix', 'NEX'],
      message: `高矩阵(${params.matrix})+高激励次数(NEX=${params.NEX})，扫描时间将过长`,
      severity: 'warning',
    });
  }

  if (params.TE > 100 && params.TR < 500) {
    conflicts.push({
      params: ['TE', 'TR'],
      message: `长TE(${params.TE}ms)配合短TR(${params.TR}ms)会导致信号严重衰减`,
      severity: 'error',
    });
  }

  return conflicts;
}

export function checkTimeBudget(
  params: ScanParams,
  timeBudget: number
): { exceeded: boolean; scanTime: number } {
  const scanTime = (params.TR * params.matrix * params.NEX) / 1000;
  return {
    exceeded: scanTime > timeBudget,
    scanTime,
  };
}

export function checkArtifactMisjudgment(imageQuality: ImageQuality): string[] {
  const misjudgments: string[] = [];

  if (imageQuality.artifacts.includes('motion') && imageQuality.snr > 0.7) {
    misjudgments.push('可能误判运动伪影为正常信号变异');
  }

  if (imageQuality.artifacts.includes('chemical_shift') && imageQuality.contrast > 0.8) {
    misjudgments.push('化学位移伪影可能被误认为组织界面');
  }

  if (imageQuality.artifacts.includes('aliasing') && imageQuality.resolution > 0.7) {
    misjudgments.push('卷折伪影可能被误认为解剖结构');
  }

  return misjudgments;
}

export function getImageQuality(params: ScanParams, level: Level): ImageQuality {
  const opt = level.optimalParams;
  const ranges = level.paramRanges;

  const snr =
    (1 - Math.abs(opt.TR - params.TR) / (ranges.TR.max - ranges.TR.min)) *
    (1 - Math.abs(opt.NEX - params.NEX) / (ranges.NEX.max - ranges.NEX.min));
  const normalizedSNR = Math.max(0, Math.min(1, (snr + 1) / 2));

  const contrast =
    (1 - Math.abs(opt.TE - params.TE) / (ranges.TE.max - ranges.TE.min)) *
    (1 - Math.abs(opt.TR - params.TR) / (ranges.TR.max - ranges.TR.min));
  const normalizedContrast = Math.max(0, Math.min(1, (contrast + 1) / 2));

  const resolution =
    (1 - Math.abs(opt.matrix - params.matrix) / (ranges.matrix.max - ranges.matrix.min)) *
    (1 - Math.abs(opt.sliceThickness - params.sliceThickness) / (ranges.sliceThickness.max - ranges.sliceThickness.min));
  const normalizedResolution = Math.max(0, Math.min(1, (resolution + 1) / 2));

  const artifacts: string[] = [];
  if (params.NEX < 2) artifacts.push('noise');
  if (params.matrix < 192) artifacts.push('pixelation');
  if (params.sliceThickness > 6) artifacts.push('partial_volume');
  if (params.TE > 120) artifacts.push('susceptibility');
  if (params.TR < 2 * params.TE) artifacts.push('motion');
  if (params.FOV < 16 && params.matrix > 256) artifacts.push('aliasing');
  if (params.TE > 80 && params.FOV > 28) artifacts.push('chemical_shift');

  return {
    snr: normalizedSNR,
    contrast: normalizedContrast,
    resolution: normalizedResolution,
    artifacts,
  };
}
