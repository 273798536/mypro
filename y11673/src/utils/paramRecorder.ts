import {
  ParamRecord,
  SimulationParams,
  SimulationStats,
  SimulationError,
  IntegrationResult,
  ExportData,
} from '../types';

export class ParamRecorder {
  private records: ParamRecord[] = [];
  private storageKey = 'blackhole_simulation_records';
  private maxRecords = 100;

  constructor() {
    this.loadFromStorage();
  }

  saveRecord(
    params: SimulationParams,
    stats: SimulationStats,
    note?: string
  ): ParamRecord {
    const record: ParamRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      params: { ...params },
      stats: { ...stats },
      note,
    };

    this.records.unshift(record);

    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(0, this.maxRecords);
    }

    this.saveToStorage();
    return record;
  }

  getRecords(): ParamRecord[] {
    return [...this.records];
  }

  getRecord(id: string): ParamRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  deleteRecord(id: string): boolean {
    const index = this.records.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.records.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  clearAllRecords(): void {
    this.records = [];
    this.saveToStorage();
  }

  exportRecord(
    params: SimulationParams,
    stats: SimulationStats,
    errors: SimulationError[],
    rayResults: IntegrationResult[]
  ): ExportData {
    return {
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      params: { ...params },
      stats: { ...stats },
      errors: [...errors],
      raySummary: rayResults.map((r) => ({
        id: r.id,
        status: r.status,
        steps: r.totalSteps,
        points: r.points.length,
      })),
    };
  }

  downloadExport(
    params: SimulationParams,
    stats: SimulationStats,
    errors: SimulationError[],
    rayResults: IntegrationResult[]
  ): void {
    const exportData = this.exportRecord(params, stats, errors, rayResults);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = this.getTimestamp();
    const filename = `params_${timestamp}.json`;

    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getRecordsSummary(): {
    total: number;
    lastRecord?: ParamRecord;
    avgMass: number;
    avgRayCount: number;
  } {
    if (this.records.length === 0) {
      return { total: 0, avgMass: 0, avgRayCount: 0 };
    }

    const totalMass = this.records.reduce((sum, r) => sum + r.params.blackHoleMass, 0);
    const totalRayCount = this.records.reduce((sum, r) => sum + r.params.rayCount, 0);

    return {
      total: this.records.length,
      lastRecord: this.records[0],
      avgMass: totalMass / this.records.length,
      avgRayCount: totalRayCount / this.records.length,
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to save records to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.records = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load records from storage:', error);
      this.records = [];
    }
  }

  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      '_' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }
}

export const paramRecorder = new ParamRecorder();
