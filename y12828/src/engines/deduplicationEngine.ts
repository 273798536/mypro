import { v4 as uuidv4 } from 'uuid';
import { isEqual } from 'lodash-es';
import {
  SourceOrigin,
  DedupResult,
  SampleVersion,
  Barcode,
  MergeStrategy,
} from '@/types';
import { versionControlEngine } from './versionControlEngine';

class DeduplicationEngine {
  private dedupResults: Map<string, DedupResult> = new Map();

  detectDuplicates(importBatch: SourceOrigin[], existingBarcodes: Barcode[]): DedupResult[] {
    const results: DedupResult[] = [];
    const barcodeCounts = new Map<Barcode, number>();
    const batchBarcodes = new Map<Barcode, SourceOrigin[]>();

    importBatch.forEach((source) => {
      const barcode = this.extractBarcodeFromSource(source);
      if (!batchBarcodes.has(barcode)) {
        batchBarcodes.set(barcode, []);
      }
      batchBarcodes.get(barcode)!.push(source);
      barcodeCounts.set(barcode, (barcodeCounts.get(barcode) || 0) + 1);
    });

    batchBarcodes.forEach((sources, barcode) => {
      const existingVersions = versionControlEngine.getVersionHistory(barcode);
      const hasExisting = existingVersions.length > 0;
      const hasBatchDuplicate = sources.length > 1;

      if (hasExisting || hasBatchDuplicate) {
        const duplicateRecords = [];

        if (hasBatchDuplicate) {
          sources.forEach((source, index) => {
            if (index > 0) {
              const similarity = this.calculateBatchSimilarity(sources[0], source);
              duplicateRecords.push({
                versionId: uuidv4(),
                sourceOrigin: source,
                importTimestamp: source.importTimestamp,
                similarity,
              });
            }
          });
        }

        if (hasExisting) {
          existingVersions.forEach((version) => {
            sources.forEach((source) => {
              const similarity = this.calculateSimilarityFromSource(version, source);
              if (similarity > 0.3) {
                duplicateRecords.push({
                  versionId: version.versionId,
                  sourceOrigin: version.sourceOrigin,
                  importTimestamp: version.sourceOrigin.importTimestamp,
                  similarity,
                });
              }
            });
          });
        }

        const dedupResult: DedupResult = {
          dedupId: uuidv4(),
          barcode,
          duplicateCount: duplicateRecords.length,
          duplicateRecords,
          isConfirmedDuplicate: false,
          mergeStrategy: null,
        };

        this.dedupResults.set(barcode, dedupResult);
        results.push(dedupResult);
      }
    });

    existingBarcodes.forEach((barcode) => {
      if (!batchBarcodes.has(barcode)) {
        const source = importBatch.find((s) => this.extractBarcodeFromSource(s) === barcode);
        if (source) {
          const existingVersion = versionControlEngine.getLatestVersion(barcode);
          if (existingVersion) {
            const similarity = this.calculateSimilarityFromSource(existingVersion, source);
            if (similarity > 0.5) {
              const dedupResult: DedupResult = {
                dedupId: uuidv4(),
                barcode,
                duplicateCount: 1,
                duplicateRecords: [
                  {
                    versionId: existingVersion.versionId,
                    sourceOrigin: existingVersion.sourceOrigin,
                    importTimestamp: existingVersion.sourceOrigin.importTimestamp,
                    similarity,
                  },
                ],
                isConfirmedDuplicate: false,
                mergeStrategy: null,
              };
              this.dedupResults.set(barcode, dedupResult);
              results.push(dedupResult);
            }
          }
        }
      }
    });

    return results;
  }

  calculateSimilarity(version1: SampleVersion, version2: SampleVersion): number {
    let score = 0;
    let totalFields = 0;

    const seq1 = version1.sequencingResult;
    const seq2 = version2.sequencingResult;

    if (seq1.geneName && seq2.geneName) {
      totalFields++;
      if (seq1.geneName === seq2.geneName) score++;
    }

    if (seq1.variant && seq2.variant) {
      totalFields++;
      if (seq1.variant === seq2.variant) score++;
    }

    if (seq1.alleleFrequency !== undefined && seq2.alleleFrequency !== undefined) {
      totalFields++;
      const freqDiff = Math.abs(seq1.alleleFrequency - seq2.alleleFrequency);
      if (freqDiff < 0.05) score++;
      else if (freqDiff < 0.1) score += 0.5;
    }

    if (seq1.qualityScore !== undefined && seq2.qualityScore !== undefined) {
      totalFields++;
      const qualDiff = Math.abs(seq1.qualityScore - seq2.qualityScore);
      if (qualDiff < 5) score++;
      else if (qualDiff < 10) score += 0.5;
    }

    const group1 = version1.groupIndicators;
    const group2 = version2.groupIndicators;

    if (group1.batchId && group2.batchId) {
      totalFields++;
      if (group1.batchId === group2.batchId) score++;
    }

    if (group1.testDate && group2.testDate) {
      totalFields++;
      if (group1.testDate === group2.testDate) score++;
    }

    if (group1.testType && group2.testType) {
      totalFields++;
      if (group1.testType === group2.testType) score++;
    }

    if (group1.operator && group2.operator) {
      totalFields++;
      if (group1.operator === group2.operator) score++;
    }

    if (group1.biosafetyCabinetId && group2.biosafetyCabinetId) {
      totalFields++;
      if (group1.biosafetyCabinetId === group2.biosafetyCabinetId) score++;
    }

    return totalFields > 0 ? score / totalFields : 0;
  }

  getDuplicateGroup(barcode: Barcode): SampleVersion[] {
    return versionControlEngine.getVersionHistory(barcode);
  }

  markAsDuplicate(barcode: Barcode, confirmed: boolean, operatorId: string): void {
    const result = this.dedupResults.get(barcode);
    if (result) {
      result.isConfirmedDuplicate = confirmed;
      result.resolvedAt = Date.now();
      result.resolvedBy = operatorId;

      const versions = versionControlEngine.getVersionHistory(barcode);
      versions.forEach((version) => {
        version.isDuplicate = confirmed;
      });
    }
  }

  setMergeStrategy(barcode: Barcode, strategy: MergeStrategy, operatorId: string): void {
    const result = this.dedupResults.get(barcode);
    if (result) {
      result.mergeStrategy = strategy;
      result.resolvedAt = Date.now();
      result.resolvedBy = operatorId;
    }
  }

  getDedupResult(barcode: Barcode): DedupResult | undefined {
    return this.dedupResults.get(barcode);
  }

  getAllDedupResults(): DedupResult[] {
    return Array.from(this.dedupResults.values());
  }

  getUnresolvedDuplicates(): DedupResult[] {
    return Array.from(this.dedupResults.values()).filter(
      (r) => !r.isConfirmedDuplicate || r.mergeStrategy === null
    );
  }

  setAllDedupResults(results: DedupResult[]): void {
    this.dedupResults.clear();
    results.forEach((r) => this.dedupResults.set(r.barcode, r));
  }

  private extractBarcodeFromSource(source: SourceOrigin): Barcode {
    return source.sourceRemark.match(/BC-\d{6}/)?.[0] || `BC-${String(source.originalRowNumber).padStart(6, '0')}`;
  }

  private calculateBatchSimilarity(source1: SourceOrigin, source2: SourceOrigin): number {
    let score = 0;
    let total = 0;

    if (source1.importBatchId && source2.importBatchId) {
      total++;
      if (source1.importBatchId === source2.importBatchId) score++;
    }

    if (source1.importOperatorId && source2.importOperatorId) {
      total++;
      if (source1.importOperatorId === source2.importOperatorId) score++;
    }

    if (source1.sourceRemark && source2.sourceRemark) {
      total++;
      const similarity = this.stringSimilarity(source1.sourceRemark, source2.sourceRemark);
      score += similarity;
    }

    if (source1.originalFileName && source2.originalFileName) {
      total++;
      const similarity = this.stringSimilarity(source1.originalFileName, source2.originalFileName);
      score += similarity;
    }

    return total > 0 ? score / total : 0;
  }

  private calculateSimilarityFromSource(version: SampleVersion, source: SourceOrigin): number {
    let score = 0;
    let total = 0;

    const versionSource = version.sourceOrigin;

    if (versionSource.importBatchId && source.importBatchId) {
      total++;
      if (versionSource.importBatchId === source.importBatchId) score++;
    }

    if (versionSource.importOperatorId && source.importOperatorId) {
      total++;
      if (versionSource.importOperatorId === source.importOperatorId) score++;
    }

    if (versionSource.sourceRemark && source.sourceRemark) {
      total++;
      const similarity = this.stringSimilarity(versionSource.sourceRemark, source.sourceRemark);
      score += similarity;
    }

    if (versionSource.originalFileName && source.originalFileName) {
      total++;
      const similarity = this.stringSimilarity(versionSource.originalFileName, source.originalFileName);
      score += similarity;
    }

    return total > 0 ? score / total : 0;
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const costs: number[][] = [];

    for (let i = 0; i <= shorter.length; i++) {
      costs[i] = [i];
    }

    for (let j = 0; j <= longer.length; j++) {
      costs[0][j] = j;
    }

    for (let i = 1; i <= shorter.length; i++) {
      for (let j = 1; j <= longer.length; j++) {
        const cost = shorter[i - 1] === longer[j - 1] ? 0 : 1;
        costs[i][j] = Math.min(
          costs[i - 1][j] + 1,
          costs[i][j - 1] + 1,
          costs[i - 1][j - 1] + cost
        );
      }
    }

    return (
      1 - costs[shorter.length][longer.length] / Math.max(longer.length, shorter.length)
    );
  }
}

export const deduplicationEngine = new DeduplicationEngine();
