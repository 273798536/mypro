import type { CrackParams, MaterialSource, CollisionResult } from '../../shared/types.js';
import { UnitConversionService } from './unitConversion.js';

export const CollisionDetectionService = {
  detect(params: CrackParams, materials: MaterialSource[]): CollisionResult {
    const lengthMm = UnitConversionService.toMm(params.lengthValue, params.lengthUnit);
    const widthMm = UnitConversionService.toMm(params.widthValue, params.widthUnit);
    const depthMm = UnitConversionService.toMm(params.depthValue, params.depthUnit);

    const hasUncalibrated = materials.some(
      (m) => m.calibrationStatus === 'uncalibrated' || m.calibrationStatus === 'conflict',
    );
    const conflictMaterial = materials.find((m) => m.calibrationStatus === 'conflict');
    const uncalibratedMaterial = materials.find((m) => m.calibrationStatus === 'uncalibrated');

    if (lengthMm > 1500 || depthMm > 60) {
      return {
        detected: true,
        overlapMaterialId:
          conflictMaterial?.id || uncalibratedMaterial?.id || materials[0]?.id,
        note: hasUncalibrated
          ? `存在${conflictMaterial ? '口径冲突' : '未校准'}材料，裂缝尺寸(${lengthMm.toFixed(0)}mm)超出阈值，疑似碰撞重叠`
          : `裂缝尺寸(${lengthMm.toFixed(0)}mm)较大，与钢筋保护层碰撞`,
        lengthMm,
        widthMm,
        depthMm,
      };
    }

    if (hasUncalibrated && lengthMm > 800) {
      return {
        detected: true,
        overlapMaterialId: uncalibratedMaterial?.id || conflictMaterial?.id,
        note: `关联材料${uncalibratedMaterial?.name || conflictMaterial?.name}存在校准异常，尺寸结果可疑`,
        lengthMm,
        widthMm,
        depthMm,
      };
    }

    return {
      detected: false,
      note: '未检测到碰撞重叠',
      lengthMm,
      widthMm,
      depthMm,
    };
  },

  buildConclusion(result: CollisionResult, crackId: string): string {
    const size = `${result.lengthMm.toFixed(0)}×${result.widthMm.toFixed(1)}×${result.depthMm.toFixed(0)}mm`;
    if (result.detected) {
      return `裂缝${crackId}：尺寸 ${size}，检测到碰撞重叠，${result.note}`;
    }
    if (result.lengthMm > 500) {
      return `裂缝${crackId}：尺寸 ${size}，中度裂缝，需表面封闭处理`;
    }
    if (result.lengthMm > 300) {
      return `裂缝${crackId}：尺寸 ${size}，轻度裂缝，建议 6 个月后复查`;
    }
    return `裂缝${crackId}：尺寸 ${size}，微裂缝，记录观察`;
  },
};
