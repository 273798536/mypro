import Dexie, { Table } from 'dexie';
import { DataPackage, AnalysisResult } from '@/types';

export class AppDatabase extends Dexie {
  packages!: Table<DataPackage, string>;
  analysisResults!: Table<AnalysisResult, string>;

  constructor() {
    super('OcclusalAnalysisDB');
    
    this.version(1).stores({
      packages: 'id, patientId, createdAt, status',
      analysisResults: 'id, packageId, createdAt, hash, [packageId+hash]'
    });
  }

  async savePackage(pkg: DataPackage): Promise<string> {
    return this.packages.put(pkg);
  }

  async getPackage(id: string): Promise<DataPackage | undefined> {
    return this.packages.get(id);
  }

  async getAllPackages(): Promise<DataPackage[]> {
    return this.packages.orderBy('createdAt').reverse().toArray();
  }

  async deletePackage(id: string): Promise<void> {
    await this.transaction('rw', this.packages, this.analysisResults, async () => {
      await this.analysisResults.where('packageId').equals(id).delete();
      await this.packages.delete(id);
    });
  }

  async saveAnalysisResult(result: AnalysisResult): Promise<string> {
    const existing = await this.analysisResults
      .where('[packageId+hash]')
      .equals([result.packageId, result.hash])
      .first();
    
    if (existing) {
      return existing.id;
    }
    
    return this.analysisResults.put(result);
  }

  async getAnalysisResult(id: string): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(id);
  }

  async getResultsByPackage(packageId: string): Promise<AnalysisResult[]> {
    const results = await this.analysisResults
      .where('packageId')
      .equals(packageId)
      .toArray();
    
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  async getAllAnalysisResults(): Promise<AnalysisResult[]> {
    const results = await this.analysisResults.toArray();
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const db = new AppDatabase();
