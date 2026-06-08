import type { ProjectionRecord, AnomalyType, Severity } from '@/types';

export function buildDedupKey(
  row: number | string,
  imageName: string,
  sourceNote: string,
): string {
  const r = String(row).trim();
  const i = imageName.trim().toLowerCase();
  const s = sourceNote.trim().toLowerCase();
  return `${r}__${i}__${s}`;
}

export function recordKey(rec: Pick<ProjectionRecord, 'originalRowNumber' | 'imageName' | 'sourceNote'>): string {
  return buildDedupKey(rec.originalRowNumber, rec.imageName, rec.sourceNote);
}

interface DedupResult {
  added: ProjectionRecord[];
  merged: ProjectionRecord[];
  duplicates: string[];
}

/**
 * 将新导入记录与已有记录去重合并。
 * 策略：
 *  1. 按 (原始行号 + 图片名 + 来源备注) 判定为同一件事；
 *  2. 若存在完全相同键 → 标记为 duplicate，字段变更合并入原记录并标记 supplemented；
 *  3. 若只有原始行号 + 图片名匹配但来源不同 → 作为补录，仍然合并并记录 supplementedFields；
 *  4. 否则为新增。
 */
export function dedupAndMerge(
  existing: ProjectionRecord[],
  incoming: ProjectionRecord[],
  nowIso: string,
): DedupResult {
  const byFullKey = new Map<string, ProjectionRecord>();
  const byRowImage = new Map<string, ProjectionRecord>();
  for (const rec of existing) {
    byFullKey.set(recordKey(rec), rec);
    byRowImage.set(`${rec.originalRowNumber}__${rec.imageName.toLowerCase()}`, rec);
  }

  const added: ProjectionRecord[] = [];
  const merged: ProjectionRecord[] = [];
  const duplicates: string[] = [];

  for (const inc of incoming) {
    const full = recordKey(inc);
    let existingRec = byFullKey.get(full);
    if (!existingRec) {
      existingRec = byRowImage.get(`${inc.originalRowNumber}__${inc.imageName.toLowerCase()}`);
    }

    if (existingRec) {
      duplicates.push(inc.imageName);
      const supplementedFields: string[] = [];
      const mergedRec: ProjectionRecord = { ...existingRec };
      const candidateFields: (keyof ProjectionRecord)[] = [
        'conclusion', 'suggestion', 'anomalyType', 'severity', 'crossSectionUrl', 'sourceNote',
      ];
      for (const f of candidateFields) {
        const a = String(inc[f] ?? '').trim();
        const b = String(existingRec[f] ?? '').trim();
        if (a && a !== b) {
          (mergedRec as any)[f] = inc[f];
          supplementedFields.push(f);
        }
      }
      if (supplementedFields.length > 0) {
        mergedRec.supplementedFields = Array.from(
          new Set([...(existingRec.supplementedFields ?? []), ...supplementedFields]),
        );
        mergedRec.status = 'supplemented';
      } else {
        mergedRec.status = existingRec.status === 'new' ? 'merged' : existingRec.status;
      }
      mergedRec.duplicateOf = existingRec.id;
      mergedRec.updatedAt = nowIso;
      mergedRec.rawSnapshot = { ...existingRec.rawSnapshot, ...inc.rawSnapshot };
      merged.push(mergedRec);
    } else {
      added.push(inc);
    }
  }

  return { added, merged, duplicates };
}

export function detectAnomaly(raw: Record<string, string | number>): {
  anomalyType: AnomalyType;
  severity: Severity;
} {
  const flag = String(raw['anomaly'] ?? raw['异常'] ?? raw['type'] ?? '').toLowerCase();
  const sev = String(raw['severity'] ?? raw['严重程度'] ?? '').toLowerCase();
  if (flag.includes('camera') || flag.includes('视角') || flag.includes('丢失')) {
    return { anomalyType: 'camera_view_lost', severity: 'critical' };
  }
  if (flag.includes('distort') || flag.includes('畸变')) {
    return { anomalyType: 'projection_distortion', severity: sev.includes('warn') || sev.includes('警告') ? 'warning' : 'info' };
  }
  if (flag.includes('scale') || flag.includes('比例')) {
    return { anomalyType: 'scale_mismatch', severity: 'warning' };
  }
  return { anomalyType: 'normal', severity: 'info' };
}
