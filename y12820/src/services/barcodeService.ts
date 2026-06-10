import { Sample, BarcodeConflict, ConflictResolution } from '../types';
import { generateId } from '../utils/mockData';

export class BarcodeDeduplicationService {
  static detectConflicts(samples: Sample[]): BarcodeConflict[] {
    const barcodeMap = new Map<string, Sample[]>();

    samples.forEach(sample => {
      const existing = barcodeMap.get(sample.barcode) || [];
      barcodeMap.set(sample.barcode, [...existing, sample]);
    });

    const conflicts: BarcodeConflict[] = [];
    barcodeMap.forEach((samples, barcode) => {
      if (samples.length > 1) {
        conflicts.push({
          barcode,
          samples,
          detectedAt: new Date(),
        });
      }
    });

    return conflicts;
  }

  static resolveConflict(
    conflict: BarcodeConflict,
    resolution: ConflictResolution,
    operator: string
  ): { kept: Sample | null; markedInvalid: Sample[] } {
    const sortedSamples = [...conflict.samples].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let kept: Sample | null = null;
    const markedInvalid: Sample[] = [];

    switch (resolution) {
      case 'keep_newest':
        kept = { ...sortedSamples[sortedSamples.length - 1], updatedAt: new Date(), updatedBy: operator };
        sortedSamples.slice(0, -1).forEach(s => {
          markedInvalid.push({
            ...s,
            status: 'invalid' as const,
            invalidReason: `条码重复，已保留最新记录（${kept!.id}）`,
            updatedAt: new Date(),
            updatedBy: operator,
          });
        });
        break;

      case 'keep_oldest':
        kept = { ...sortedSamples[0], updatedAt: new Date(), updatedBy: operator };
        sortedSamples.slice(1).forEach(s => {
          markedInvalid.push({
            ...s,
            status: 'invalid' as const,
            invalidReason: `条码重复，已保留最早记录（${kept!.id}）`,
            updatedAt: new Date(),
            updatedBy: operator,
          });
        });
        break;

      case 'merge':
        kept = this.mergeSamples(sortedSamples, operator);
        sortedSamples.slice(1).forEach(s => {
          if (s.id !== kept!.id) {
            markedInvalid.push({
              ...s,
              status: 'invalid' as const,
              invalidReason: `条码重复，已合并到记录（${kept!.id}）`,
              updatedAt: new Date(),
              updatedBy: operator,
            });
          }
        });
        break;

      case 'mark_invalid':
        sortedSamples.forEach(s => {
          markedInvalid.push({
            ...s,
            status: 'invalid' as const,
            invalidReason: '条码重复，全部标记作废',
            updatedAt: new Date(),
            updatedBy: operator,
          });
        });
        break;
    }

    return { kept, markedInvalid };
  }

  static mergeSamples(samples: Sample[], operator: string): Sample {
    if (samples.length === 0) {
      throw new Error('Cannot merge empty sample list');
    }

    const target = { ...samples[0] };

    samples.slice(1).forEach(source => {
      Object.keys(source).forEach(key => {
        const k = key as keyof Sample;
        if (target[k] === undefined || target[k] === null || target[k] === '') {
          (target as Record<string, unknown>)[k] = source[k];
        }
      });
    });

    return {
      ...target,
      id: generateId(),
      updatedAt: new Date(),
      updatedBy: operator,
    };
  }

  static findFieldDifferences(sampleA: Sample, sampleB: Sample): Array<{ field: string; valueA: unknown; valueB: unknown }> {
    const differences: Array<{ field: string; valueA: unknown; valueB: unknown }> = [];
    const fields = Object.keys(sampleA) as Array<keyof Sample>;

    fields.forEach(field => {
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt') return;

      const valueA = sampleA[field];
      const valueB = sampleB[field];

      if (valueA instanceof Date && valueB instanceof Date) {
        if (valueA.getTime() !== valueB.getTime()) {
          differences.push({ field, valueA, valueB });
        }
      } else if (valueA !== valueB) {
        differences.push({ field, valueA, valueB });
      }
    });

    return differences;
  }
}
