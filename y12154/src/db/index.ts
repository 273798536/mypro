import Dexie, { Table } from 'dexie';
import type {
  ElevatorProfile,
  InspectionRecord,
  BrakeCalculation,
  AbnormalDetection,
  ThresholdCheck,
  DataTrace,
  BadRow,
  ThresholdConfig,
  RecordWithDetails,
} from '../types';
import { DEFAULT_THRESHOLD_CONFIG } from '../utils/constants';

export class AppDatabase extends Dexie {
  elevatorProfiles!: Table<ElevatorProfile>;
  inspectionRecords!: Table<InspectionRecord>;
  brakeCalculations!: Table<BrakeCalculation>;
  abnormalDetections!: Table<AbnormalDetection>;
  thresholdChecks!: Table<ThresholdCheck>;
  dataTraces!: Table<DataTrace>;
  badRows!: Table<BadRow>;
  thresholdConfigs!: Table<ThresholdConfig & { id: string; isActive: boolean }>;

  constructor() {
    super('ElevatorBrakeDB');

    this.version(1).stores({
      elevatorProfiles: 'id, elevatorNo, createdAt',
      inspectionRecords: 'id, elevatorId, inspectionDate, dataStatus, createdAt',
      brakeCalculations: 'id, recordId, calculatedAt',
      abnormalDetections: 'id, recordId, abnormalLevel, detectedAt',
      thresholdChecks: 'id, recordId, overallResult, checkedAt',
      dataTraces: 'id, recordId, traceStep, operatedAt',
      badRows: 'id, recordId, sourceFile, createdAt',
      thresholdConfigs: 'id',
    });
  }

  async getActiveThresholdConfig(): Promise<ThresholdConfig> {
    const allConfigs = await this.thresholdConfigs.toArray();
    const active = allConfigs.find(c => c.isActive);
    return active || DEFAULT_THRESHOLD_CONFIG;
  }

  async setActiveThresholdConfig(config: ThresholdConfig): Promise<string> {
    const allConfigs = await this.thresholdConfigs.toArray();
    for (const c of allConfigs) {
      if (c.isActive) {
        await this.thresholdConfigs.update(c.id, { isActive: false });
      }
    }
    const id = `config_${Date.now()}`;
    await this.thresholdConfigs.add({ ...config, id, isActive: true });
    return id;
  }

  async getRecordWithDetails(recordId: string): Promise<RecordWithDetails | null> {
    const record = await this.inspectionRecords.get(recordId);
    if (!record) return null;

    const [elevator, calculation, abnormal, threshold, traces] = await Promise.all([
      this.elevatorProfiles.get(record.elevatorId),
      this.brakeCalculations.where('recordId').equals(recordId).first(),
      this.abnormalDetections.where('recordId').equals(recordId).first(),
      this.thresholdChecks.where('recordId').equals(recordId).first(),
      this.dataTraces.where('recordId').equals(recordId).sortBy('operatedAt'),
    ]);

    if (!elevator) return null;

    return {
      ...record,
      elevator,
      profile: elevator,
      record,
      calculation: calculation || null,
      abnormal: abnormal || null,
      detection: abnormal || null,
      threshold: threshold || null,
      traces,
    };
  }

  async clearAllData() {
    await Promise.all([
      this.elevatorProfiles.clear(),
      this.inspectionRecords.clear(),
      this.brakeCalculations.clear(),
      this.abnormalDetections.clear(),
      this.thresholdChecks.clear(),
      this.dataTraces.clear(),
      this.badRows.clear(),
    ]);
  }
}

export const db = new AppDatabase();

export async function initDatabase() {
  const allConfigs = await db.thresholdConfigs.toArray();
  const existingConfig = allConfigs.filter(c => c.isActive).length;
  if (existingConfig === 0) {
    await db.thresholdConfigs.add({
      ...DEFAULT_THRESHOLD_CONFIG,
      id: 'config_default',
      isActive: true,
    });
  }
}
