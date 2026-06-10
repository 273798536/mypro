import { v4 as uuidv4 } from 'uuid';
import {
  Barcode,
  SampleVersion,
  SourceOrigin,
  DiffResult,
  SequencingResult,
  GroupIndicators,
  SampleStatus,
} from '@/types';
import { diffEngine } from './diffEngine';

class VersionControlEngine {
  private versions: Map<string, SampleVersion[]> = new Map();

  createVersion(
    barcode: Barcode,
    data: Partial<SampleVersion>,
    source: SourceOrigin,
    parentVersionId?: string
  ): SampleVersion {
    const existingVersions = this.versions.get(barcode) || [];
    const versionNumber = existingVersions.length + 1;

    const newVersion: SampleVersion = {
      versionId: uuidv4(),
      versionNumber,
      parentVersionId: parentVersionId || existingVersions[existingVersions.length - 1]?.versionId || null,
      barcode,
      sequencingResult: data.sequencingResult || this.createDefaultSequencingResult(),
      manualCorrections: data.manualCorrections || [],
      groupIndicators: data.groupIndicators || this.createDefaultGroupIndicators(),
      createdAt: Date.now(),
      createdBy: data.createdBy || 'system',
      changeReason: data.changeReason || '数据导入',
      isDuplicate: data.isDuplicate || false,
      sourceOrigin: source,
      aiAnalysis: data.aiAnalysis,
      status: data.status || 'pending',
    };

    const updatedVersions = [...existingVersions, newVersion];
    this.versions.set(barcode, updatedVersions);

    return newVersion;
  }

  compareVersions(oldId: string, newId: string): DiffResult | null {
    const oldVersion = this.findVersionById(oldId);
    const newVersion = this.findVersionById(newId);

    if (!oldVersion || !newVersion) {
      return null;
    }

    return diffEngine.highlightDifferences(oldVersion, newVersion);
  }

  getVersionHistory(barcode: Barcode): SampleVersion[] {
    return this.versions.get(barcode) || [];
  }

  getLatestVersion(barcode: Barcode): SampleVersion | null {
    const versions = this.versions.get(barcode);
    return versions?.[versions.length - 1] || null;
  }

  findVersionById(versionId: string): SampleVersion | null {
    for (const versions of this.versions.values()) {
      const found = versions.find((v) => v.versionId === versionId);
      if (found) return found;
    }
    return null;
  }

  rollbackToVersion(versionId: string, operatorId: string): SampleVersion | null {
    const versionToRollback = this.findVersionById(versionId);
    if (!versionToRollback) return null;

    return this.createVersion(
      versionToRollback.barcode,
      {
        sequencingResult: { ...versionToRollback.sequencingResult },
        groupIndicators: { ...versionToRollback.groupIndicators },
        createdBy: operatorId,
        changeReason: `回滚至版本 v${versionToRollback.versionNumber}`,
        status: 'reviewing',
      },
      versionToRollback.sourceOrigin,
      versionId
    );
  }

  getAllVersions(): SampleVersion[] {
    const allVersions: SampleVersion[] = [];
    for (const versions of this.versions.values()) {
      allVersions.push(...versions);
    }
    return allVersions.sort((a, b) => b.createdAt - a.createdAt);
  }

  updateVersionStatus(versionId: string, status: SampleStatus): SampleVersion | null {
    const version = this.findVersionById(versionId);
    if (!version) return null;

    version.status = status;
    return version;
  }

  setVersions(barcode: Barcode, versions: SampleVersion[]): void {
    this.versions.set(barcode, versions);
  }

  private createDefaultSequencingResult(): SequencingResult {
    return {
      geneName: '',
      variant: '',
      alleleFrequency: 0,
      qualityScore: 0,
      coverage: 0,
      interpretation: '',
    };
  }

  private createDefaultGroupIndicators(): GroupIndicators {
    return {
      groupId: uuidv4(),
      batchId: '',
      testDate: new Date().toISOString().split('T')[0],
      testType: '',
      operator: '',
      biosafetyCabinetId: '',
    };
  }
}

export const versionControlEngine = new VersionControlEngine();
