import type { Sample, SourceTrace, ImportBatch } from '@/types';

export interface DedupResult {
  newSamples: Sample[];
  updatedSamples: Sample[];
  duplicateCount: number;
  mergeDetails: MergeDetail[];
}

export interface MergeDetail {
  barcode: string;
  oldSample: Sample;
  newSample: Sample;
  mergedSample: Sample;
  mergedFields: string[];
}

export function deduplicateSamples(
  newSamples: Sample[],
  existingSamples: Sample[],
  sourceTraces: SourceTrace[],
  importBatch: ImportBatch
): DedupResult {
  const newSamplesFinal: Sample[] = [];
  const updatedSamples: Sample[] = [];
  const mergeDetails: MergeDetail[] = [];

  const existingMap = new Map<string, Sample>();
  existingSamples.forEach((s) => {
    const key = `${s.barcode}_${s.batchNo}`;
    existingMap.set(key, s);
  });

  newSamples.forEach((newSample) => {
    const key = `${newSample.barcode}_${newSample.batchNo}`;
    const existing = existingMap.get(key);

    if (existing) {
      const merged = mergeSample(existing, newSample);
      const mergedFields = getMergedFields(existing, newSample);

      if (mergedFields.length > 0) {
        updatedSamples.push(merged);
        mergeDetails.push({
          barcode: newSample.barcode,
          oldSample: existing,
          newSample,
          mergedSample: merged,
          mergedFields
        });
      }
    } else {
      newSamplesFinal.push(newSample);
    }
  });

  return {
    newSamples: newSamplesFinal,
    updatedSamples,
    duplicateCount: newSamples.length - newSamplesFinal.length,
    mergeDetails
  };
}

function mergeSample(existing: Sample, newSample: Sample): Sample {
  const merged: Sample = { ...existing };

  if (!existing.sampleType || existing.sampleType === '未知类型') {
    merged.sampleType = newSample.sampleType;
  }

  if (!existing.name && newSample.name) {
    merged.name = newSample.name;
  }

  if (existing.concentration === undefined && newSample.concentration !== undefined) {
    merged.concentration = newSample.concentration;
  }

  if (existing.cellCount === undefined && newSample.cellCount !== undefined) {
    merged.cellCount = newSample.cellCount;
  }

  if (!existing.remark && newSample.remark) {
    merged.remark = newSample.remark;
  } else if (existing.remark && newSample.remark && existing.remark !== newSample.remark) {
    merged.remark = existing.remark + '；' + newSample.remark;
  }

  merged.updatedAt = new Date().toISOString();

  return merged;
}

function getMergedFields(existing: Sample, newSample: Sample): string[] {
  const fields: string[] = [];

  if ((!existing.sampleType || existing.sampleType === '未知类型') && newSample.sampleType) {
    fields.push('样本类型');
  }
  if (!existing.name && newSample.name) {
    fields.push('样本名称');
  }
  if (existing.concentration === undefined && newSample.concentration !== undefined) {
    fields.push('浓度');
  }
  if (existing.cellCount === undefined && newSample.cellCount !== undefined) {
    fields.push('细胞数');
  }
  if (!existing.remark && newSample.remark) {
    fields.push('备注');
  }

  return fields;
}

export function generateDedupSummary(details: MergeDetail[]): string {
  if (details.length === 0) {
    return '本次导入无重复条码。';
  }

  const summary = details
    .map((d) => {
      const fieldList = d.mergedFields.length > 0 ? d.mergedFields.join('、') : '无新信息补充';
      return `条码 ${d.barcode}：补充字段 - ${fieldList}`;
    })
    .join('\n');

  return `本次导入发现 ${details.length} 条重复记录，采用"合并补充"策略。\n${summary}`;
}
