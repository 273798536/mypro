import type { LayerRow, ValidationEntry, AngleParams, IssueType } from '@/types';

export function validateLayers(
  layers: LayerRow[],
  angle: AngleParams
): ValidationEntry[] {
  const entries: ValidationEntry[] = [];
  const tracePrefix = `val_${Date.now().toString(36)}`;

  for (const layer of layers) {
    const s = layer.status;

    if (s.isEmpty) {
      entries.push({
        traceId: `${tracePrefix}_row${layer.rowIndex}_empty`,
        rowIndex: layer.rowIndex,
        issueType: 'empty_row',
        description: `第 ${layer.rowIndex} 行为空行`,
        rawContent: s.rawContent,
      });
      continue;
    }

    if (s.isComment) {
      entries.push({
        traceId: `${tracePrefix}_row${layer.rowIndex}_comment`,
        rowIndex: layer.rowIndex,
        issueType: 'comment_row',
        description: `第 ${layer.rowIndex} 行为备注行`,
        rawContent: s.rawContent,
      });
      continue;
    }

    if (s.missingColumns) {
      entries.push({
        traceId: `${tracePrefix}_row${layer.rowIndex}_misscol`,
        rowIndex: layer.rowIndex,
        issueType: 'missing_column',
        description: `第 ${layer.rowIndex} 行列数据不完整（需要：材料 折射率 消光系数 层厚）`,
        rawContent: s.rawContent,
      });
    }

    if (s.zeroThickness) {
      entries.push({
        traceId: `${tracePrefix}_row${layer.rowIndex}_zero`,
        rowIndex: layer.rowIndex,
        issueType: 'zero_thickness',
        description: `第 ${layer.rowIndex} 行层厚为零，不参与正常计算`,
        rawContent: s.rawContent,
      });
    }

    if (s.missingRefractiveIndex) {
      entries.push({
        traceId: `${tracePrefix}_row${layer.rowIndex}_missn`,
        rowIndex: layer.rowIndex,
        issueType: 'missing_n',
        description: `第 ${layer.rowIndex} 行折射率缺失，需补充后重新计算`,
        rawContent: s.rawContent,
      });
    }
  }

  if (angle.angleDeg < 0 || angle.angleDeg >= 90) {
    entries.push({
      traceId: `${tracePrefix}_angle_oob`,
      rowIndex: 0,
      issueType: 'angle_oob',
      description: `入射角 ${angle.angleDeg}° 超出有效范围 [0°, 90°)`,
      rawContent: `angle=${angle.angleDeg}`,
    });
  }

  return entries;
}

export function getValidLayers(layers: LayerRow[]): LayerRow[] {
  return layers.filter(
    (l) =>
      !l.status.isEmpty &&
      !l.status.isComment &&
      !l.status.missingColumns &&
      !l.status.zeroThickness &&
      !l.status.missingRefractiveIndex
  );
}

export function getBadRows(layers: LayerRow[]): LayerRow[] {
  return layers.filter(
    (l) =>
      l.status.isEmpty ||
      l.status.isComment ||
      l.status.missingColumns ||
      l.status.zeroThickness ||
      l.status.missingRefractiveIndex
  );
}

export function getIssueCounts(entries: ValidationEntry[]): Record<IssueType, number> {
  const counts: Record<IssueType, number> = {
    zero_thickness: 0,
    missing_n: 0,
    angle_oob: 0,
    missing_column: 0,
    empty_row: 0,
    comment_row: 0,
  };
  for (const e of entries) {
    counts[e.issueType] = (counts[e.issueType] || 0) + 1;
  }
  return counts;
}
