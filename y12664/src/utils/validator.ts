import type { Cage, LayoutConfig, ValidationIssue } from '@/types';

export function validateCages(cages: Cage[], config: LayoutConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { bounds, spacingY } = config;

  for (const cage of cages) {
    if (
      cage.x < bounds.minX ||
      cage.x > bounds.maxX ||
      cage.y < bounds.minY ||
      cage.y > bounds.maxY ||
      cage.z < bounds.minZ ||
      cage.z > bounds.maxZ
    ) {
      const out: string[] = [];
      if (cage.x < bounds.minX) out.push(`X=${cage.x.toFixed(2)} < 最小 ${bounds.minX}`);
      if (cage.x > bounds.maxX) out.push(`X=${cage.x.toFixed(2)} > 最大 ${bounds.maxX}`);
      if (cage.y < bounds.minY) out.push(`Y=${cage.y.toFixed(2)} < 最小 ${bounds.minY}`);
      if (cage.y > bounds.maxY) out.push(`Y=${cage.y.toFixed(2)} > 最大 ${bounds.maxY}`);
      if (cage.z < bounds.minZ) out.push(`Z=${cage.z.toFixed(2)} < 最小 ${bounds.minZ}`);
      if (cage.z > bounds.maxZ) out.push(`Z=${cage.z.toFixed(2)} > 最大 ${bounds.maxZ}`);
      issues.push({
        type: 'out_of_bounds',
        cageId: cage.id,
        message: `笼位 ${cage.remark} 坐标越界`,
        detail: out.join('; '),
      });
    }

    const expectedY = cage.layer * spacingY + 0.4;
    const yDiff = Math.abs(cage.y - expectedY);
    if (yDiff > spacingY * 1.5 && cage.y > expectedY + spacingY) {
      issues.push({
        type: 'floating',
        cageId: cage.id,
        message: `笼位 ${cage.remark} 存在漂浮风险`,
        detail: `层 ${cage.layer} 理论 Y ≈ ${expectedY.toFixed(2)}，实际 Y = ${cage.y.toFixed(2)}，偏移 ${yDiff.toFixed(2)}，疑似离群点漂浮`,
      });
    }
  }

  return issues;
}

export function validateCamera(
  position: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  config: LayoutConfig,
): ValidationIssue | null {
  const dist = Math.sqrt(
    Math.pow(position.x - target.x, 2) +
      Math.pow(position.y - target.y, 2) +
      Math.pow(position.z - target.z, 2),
  );

  if (!isFinite(dist) || dist < 0.5) {
    return {
      type: 'camera_lost',
      message: '相机视角丢失：相机与目标点距离异常',
      detail: `相机距离目标仅 ${dist.toFixed(3)}，小于阈值 0.5，可能因目标点越界或相机被重置导致。请重新调整视角或加载已保存视角。`,
    };
  }

  const { bounds } = config;
  const tOut: string[] = [];
  if (target.x < bounds.minX - 5 || target.x > bounds.maxX + 5)
    tOut.push(`目标 X=${target.x.toFixed(2)} 超出排布范围`);
  if (target.y < bounds.minY - 2 || target.y > bounds.maxY + 5)
    tOut.push(`目标 Y=${target.y.toFixed(2)} 超出排布范围`);
  if (target.z < bounds.minZ - 5 || target.z > bounds.maxZ + 5)
    tOut.push(`目标 Z=${target.z.toFixed(2)} 超出排布范围`);

  if (tOut.length > 0) {
    return {
      type: 'camera_lost',
      message: '相机视角丢失：目标点越出排布区域',
      detail: tOut.join('；') + '。相机对准了排布区域外的点，笼位可能不在视野内，请恢复默认视角。',
    };
  }

  return null;
}
