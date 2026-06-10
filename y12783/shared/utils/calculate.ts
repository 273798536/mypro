import type { ThicknessParameters, ThicknessAlgorithm } from '../types';

export function calculateThickness(
  parameters: ThicknessParameters,
  algorithm: ThicknessAlgorithm = 'standard',
  blankControlComplete: boolean = true
): { thicknessNm: number; confidenceMin: number; confidenceMax: number } {
  const { wavelength, refractiveIndex, reflectance, transmittance } = parameters;

  let thicknessNm: number;
  let confidenceFactor: number;

  if (algorithm === 'standard' && blankControlComplete) {
    if (reflectance !== undefined) {
      thicknessNm = (wavelength * reflectance * 100) / (4 * refractiveIndex);
    } else if (transmittance !== undefined) {
      thicknessNm = (wavelength * (1 - transmittance) * 120) / (4 * refractiveIndex);
    } else {
      thicknessNm = wavelength / (4 * refractiveIndex) * 100;
    }
    confidenceFactor = 0.02;
  } else {
    if (reflectance !== undefined) {
      thicknessNm = (wavelength * reflectance * 110) / (4 * refractiveIndex);
    } else if (transmittance !== undefined) {
      thicknessNm = (wavelength * (1 - transmittance) * 130) / (4 * refractiveIndex);
    } else {
      thicknessNm = wavelength / (4 * refractiveIndex) * 110;
    }
    confidenceFactor = 0.08;
  }

  const delta = thicknessNm * confidenceFactor;

  return {
    thicknessNm: Number(thicknessNm.toFixed(2)),
    confidenceMin: Number((thicknessNm - delta).toFixed(2)),
    confidenceMax: Number((thicknessNm + delta).toFixed(2)),
  };
}

export function generateId(prefix: string = ''): string {
  const random = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}${timestamp}-${random}`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
