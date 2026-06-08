import type { LengthUnit, WidthUnit, DepthUnit } from '../../shared/types.js';

export const UnitConversionService = {
  toMm(value: number, unit: LengthUnit | WidthUnit | DepthUnit): number {
    switch (unit) {
      case 'mm':
        return value;
      case 'cm':
        return value * 10;
      case 'm':
        return value * 1000;
      default:
        return value;
    }
  },

  formatSize(length: number, width: number, depth: number): string {
    return `长${length.toFixed(1)}mm × 宽${width.toFixed(1)}mm × 深${depth.toFixed(1)}mm`;
  },

  detectUnitAbnormality(
    value: number,
    unit: LengthUnit | WidthUnit | DepthUnit,
    thresholdMm = 2000,
  ): { abnormal: boolean; reason?: string } {
    const mm = this.toMm(value, unit);
    if (mm > thresholdMm && unit !== 'mm') {
      return {
        abnormal: true,
        reason: `换算后为 ${mm.toFixed(0)}mm，超过阈值 ${thresholdMm}mm，疑似单位应为 mm 而非 ${unit}`,
      };
    }
    if (mm < 0.1) {
      return { abnormal: true, reason: '尺寸值过小，可能存在录入错误' };
    }
    return { abnormal: false };
  },
};
