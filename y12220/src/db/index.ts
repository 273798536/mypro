import Dexie, { Table } from 'dexie';
import type {
  TicketOrder,
  Segment,
  RebookRecord,
  AnomalyItem,
  Explanation,
  CalculationDetail,
  CabinPrice,
  TaxRule,
  AuditLog,
  User,
  SystemSettings,
} from '../types';

export class AppDatabase extends Dexie {
  ticketOrders!: Table<TicketOrder, string>;
  segments!: Table<Segment, string>;
  rebookRecords!: Table<RebookRecord, string>;
  anomalyItems!: Table<AnomalyItem, string>;
  explanations!: Table<Explanation, string>;
  calculationDetails!: Table<CalculationDetail, string>;
  cabinPrices!: Table<CabinPrice, string>;
  taxRules!: Table<TaxRule, string>;
  auditLogs!: Table<AuditLog, string>;
  users!: Table<User, string>;
  settings!: Table<SystemSettings, string>;

  constructor() {
    super('AirlineRebookDB');

    this.version(1).stores({
      ticketOrders: 'id, orderNo, passengerName, createdAt, updatedAt',
      segments: 'id, ticketId, flightNo, cabinClass, departureAirport, arrivalAirport',
      rebookRecords: 'id, ticketId, orderNo, status, createdAt, submittedAt, reviewedAt, createdBy',
      anomalyItems: 'id, rebookId, type, severity',
      explanations: 'id, anomalyId, explainedBy, createdAt',
      calculationDetails: 'id, rebookId',
      cabinPrices: 'id, flightNo, cabinClass, effectiveDate',
      taxRules: 'id, country, taxCode',
      auditLogs: 'id, recordId, recordType, action, operator, timestamp',
      users: 'id, username, role, name',
      settings: 'id',
    });
  }

  async logAction(
    recordId: string,
    recordType: AuditLog['recordType'],
    action: string,
    operator: string,
    oldValue?: string,
    newValue?: string
  ): Promise<string> {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      recordId,
      recordType,
      action,
      operator,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
    };
    await this.auditLogs.add(log);
    return log.id;
  }

  async getAuditLogsForRecord(recordId: string): Promise<AuditLog[]> {
    return this.auditLogs.where('recordId').equals(recordId).reverse().sortBy('timestamp');
  }

  async getSettings(): Promise<SystemSettings> {
    const settings = await this.settings.get('default');
    if (!settings) {
      const defaultSettings: SystemSettings = {
        mileageRate: 0.01,
        anomalyThreshold: 500,
        autoDetectAnomalies: true,
        requireExplanationForWarnings: true,
      };
      await this.settings.put({ ...defaultSettings, id: 'default' } as SystemSettings & { id: string });
      return defaultSettings;
    }
    return settings;
  }

  async updateSettings(newSettings: Partial<SystemSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.settings.put({ ...current, ...newSettings, id: 'default' } as SystemSettings & { id: string });
  }
}

export const db = new AppDatabase();

export default db;
