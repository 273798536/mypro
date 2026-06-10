import { isEqual, isObject, transform } from 'lodash-es';
import { SampleVersion, DiffResult, ChangedField, AiAnalysisResult } from '@/types';

class DiffEngine {
  calculateFieldDiff(oldValue: any, newValue: any, field: string): { changed: boolean; diff: any } {
    if (oldValue === newValue) {
      return { changed: false, diff: null };
    }

    if (isObject(oldValue) && isObject(newValue)) {
      const diff = this.objectDiff(oldValue, newValue);
      return {
        changed: Object.keys(diff).length > 0,
        diff: Object.keys(diff).length > 0 ? diff : null,
      };
    }

    return {
      changed: true,
      diff: { old: oldValue, new: newValue },
    };
  }

  highlightDifferences(
    oldVersion: SampleVersion,
    newVersion: SampleVersion,
    aiAnalysis?: AiAnalysisResult | null
  ): DiffResult {
    const changedFields: ChangedField[] = [];

    const fieldsToCheck = [
      { key: 'sequencingResult', label: '测序结果' },
      { key: 'groupIndicators', label: '分组指标' },
      { key: 'status', label: '状态' },
    ];

    fieldsToCheck.forEach(({ key }) => {
      const oldVal = oldVersion[key as keyof SampleVersion];
      const newVal = newVersion[key as keyof SampleVersion];

      if (isObject(oldVal) && isObject(newVal)) {
        const objDiff = this.objectDiff(oldVal as Record<string, any>, newVal as Record<string, any>);
        Object.entries(objDiff).forEach(([field, values]) => {
          const aiSuggestion = aiAnalysis?.suggestions.find(
            (s) => s.field === `${key}.${field}` || s.field === field
          );
          changedFields.push({
            field: `${key}.${field}`,
            oldValue: (values as any).old,
            newValue: (values as any).new,
            isAiSuggested: !!aiSuggestion,
            confidence: aiSuggestion?.confidence || 0,
          });
        });
      } else if (oldVal !== newVal) {
        const aiSuggestion = aiAnalysis?.suggestions.find((s) => s.field === key);
        changedFields.push({
          field: key,
          oldValue: oldVal,
          newValue: newVal,
          isAiSuggested: !!aiSuggestion,
          confidence: aiSuggestion?.confidence || 0,
        });
      }
    });

    if (newVersion.manualCorrections.length > oldVersion.manualCorrections.length) {
      const newCorrections = newVersion.manualCorrections.slice(
        oldVersion.manualCorrections.length
      );
      newCorrections.forEach((correction) => {
        changedFields.push({
          field: `manualCorrection.${correction.fieldName}`,
          oldValue: correction.oldValue,
          newValue: correction.newValue,
          isAiSuggested: false,
          confidence: 1,
        });
      });
    }

    return {
      barcode: newVersion.barcode,
      oldVersion,
      newVersion,
      changedFields,
      aiAnalysis: aiAnalysis || null,
      timestamp: Date.now(),
    };
  }

  getPendingDiffs(
    versions: SampleVersion[],
    dateRange?: [number, number]
  ): DiffResult[] {
    const diffs: DiffResult[] = [];

    const barcodes = new Set(versions.map((v) => v.barcode));

    barcodes.forEach((barcode) => {
      const sampleVersions = versions
        .filter((v) => v.barcode === barcode)
        .sort((a, b) => a.versionNumber - b.versionNumber);

      for (let i = 1; i < sampleVersions.length; i++) {
        const oldVersion = sampleVersions[i - 1];
        const newVersion = sampleVersions[i];

        if (dateRange) {
          if (newVersion.createdAt < dateRange[0] || newVersion.createdAt > dateRange[1]) {
            continue;
          }
        }

        if (newVersion.status !== 'confirmed') {
          const diff = this.highlightDifferences(oldVersion, newVersion, newVersion.aiAnalysis);
          if (diff.changedFields.length > 0) {
            diffs.push(diff);
          }
        }
      }
    });

    return diffs.sort((a, b) => b.timestamp - a.timestamp);
  }

  private objectDiff(
    oldObj: Record<string, any>,
    newObj: Record<string, any>
  ): Record<string, { old: any; new: any }> {
    return transform(
      newObj,
      (result: Record<string, any>, value: any, key: string) => {
        if (!isEqual(value, oldObj[key])) {
          result[key] = {
            old: oldObj[key],
            new: value,
          };
        }
      },
      {}
    );
  }

  formatFieldLabel(field: string): string {
    const fieldLabels: Record<string, string> = {
      'sequencingResult.geneName': '基因名称',
      'sequencingResult.variant': '变异类型',
      'sequencingResult.alleleFrequency': '等位基因频率',
      'sequencingResult.qualityScore': '质量评分',
      'sequencingResult.coverage': '覆盖度',
      'sequencingResult.interpretation': '结果解读',
      'groupIndicators.batchId': '批次号',
      'groupIndicators.testDate': '检验日期',
      'groupIndicators.testType': '检验类型',
      'groupIndicators.operator': '操作人',
      'groupIndicators.biosafetyCabinetId': '生物安全柜编号',
      status: '样本状态',
    };

    if (field.startsWith('manualCorrection.')) {
      const fieldName = field.replace('manualCorrection.', '');
      return `人工修正: ${fieldLabels[fieldName] || fieldName}`;
    }

    return fieldLabels[field] || field;
  }
}

export const diffEngine = new DiffEngine();
