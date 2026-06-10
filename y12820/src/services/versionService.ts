import { Sample, SampleVersion, ManualCorrection } from '../types';
import { generateId } from '../utils/mockData';

export class VersionControlService {
  static createVersion(
    sample: Sample,
    changeReason: string,
    operator: string,
    existingVersions: SampleVersion[]
  ): SampleVersion {
    const maxVersion = existingVersions.reduce(
      (max, v) => Math.max(max, v.version),
      0
    );

    return {
      id: generateId(),
      sampleId: sample.id,
      version: maxVersion + 1,
      data: JSON.parse(JSON.stringify(sample)),
      changeReason,
      operator,
      createdAt: new Date(),
    };
  }

  static getVersions(sampleId: string, allVersions: SampleVersion[]): SampleVersion[] {
    return allVersions
      .filter(v => v.sampleId === sampleId)
      .sort((a, b) => b.version - a.version);
  }

  static rollbackToVersion(
    sample: Sample,
    versionId: string,
    allVersions: SampleVersion[],
    operator: string
  ): { updatedSample: Sample; newVersion: SampleVersion; correction: ManualCorrection } {
    const targetVersion = allVersions.find(v => v.id === versionId);
    if (!targetVersion) {
      throw new Error('Version not found');
    }

    const corrections: ManualCorrection[] = [];
    const originalFields = Object.keys(sample) as Array<keyof Sample>;

    originalFields.forEach(field => {
      if (field === 'id' || field === 'createdAt' || field === 'updatedAt') return;

      const oldValue = String(sample[field]);
      const newValue = String(targetVersion.data[field]);

      if (oldValue !== newValue) {
        corrections.push({
          id: generateId(),
          sampleId: sample.id,
          fieldName: field,
          oldValue,
          newValue,
          reason: `回滚到版本 v${targetVersion.version}`,
          corrector: operator,
          correctedAt: new Date(),
          isRollback: true,
        });
      }
    });

    const updatedSample: Sample = {
      ...targetVersion.data,
      updatedAt: new Date(),
      updatedBy: operator,
    };

    const newVersion = this.createVersion(
      updatedSample,
      `回滚到版本 v${targetVersion.version}`,
      operator,
      allVersions
    );

    return {
      updatedSample,
      newVersion,
      correction: corrections[0],
    };
  }

  static getVersionDiff(versionA: SampleVersion, versionB: SampleVersion): Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }> {
    const differences: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
    const fields = Object.keys(versionA.data) as Array<keyof Sample>;

    fields.forEach(field => {
      const valueA = versionA.data[field];
      const valueB = versionB.data[field];

      if (valueA instanceof Date && valueB instanceof Date) {
        if (valueA.getTime() !== valueB.getTime()) {
          differences.push({ field, oldValue: valueA, newValue: valueB });
        }
      } else if (valueA !== valueB) {
        differences.push({ field, oldValue: valueA, newValue: valueB });
      }
    });

    return differences;
  }

  static createManualCorrection(
    sample: Sample,
    fieldName: string,
    oldValue: string,
    newValue: string,
    reason: string,
    corrector: string
  ): { correction: ManualCorrection; updatedSample: Sample } {
    const correction: ManualCorrection = {
      id: generateId(),
      sampleId: sample.id,
      fieldName,
      oldValue,
      newValue,
      reason,
      corrector,
      correctedAt: new Date(),
      isRollback: false,
    };

    const updatedSample: Sample = {
      ...sample,
      [fieldName]: newValue,
      updatedAt: new Date(),
      updatedBy: corrector,
    } as Sample;

    return { correction, updatedSample };
  }
}
