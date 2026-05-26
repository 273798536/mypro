import Dexie, { Table } from 'dexie';
import {
  CustomerOrder,
  BankStatement,
  PlatformBill,
  ExchangeRate,
  MatchingRecord,
  ExchangeLoss,
  AuditLog,
} from '../types';

export class ExchangeLossDB extends Dexie {
  customerOrders!: Table<CustomerOrder, string>;
  bankStatements!: Table<BankStatement, string>;
  platformBills!: Table<PlatformBill, string>;
  exchangeRates!: Table<ExchangeRate, string>;
  matchingRecords!: Table<MatchingRecord, string>;
  exchangeLosses!: Table<ExchangeLoss, string>;
  auditLogs!: Table<AuditLog, string>;

  constructor() {
    super('ExchangeLossDB');

    this.version(1).stores({
      customerOrders: 'id, orderNo, customerName, orderDate, currency',
      bankStatements: 'id, referenceNo, transactionDate, currency, payerInfo',
      platformBills: 'id, billNo, platform, billDate, orderNo, currency',
      exchangeRates: 'id, [baseCurrency+targetCurrency+date]',
      matchingRecords: 'id, orderId, statementId, billId, status, matchedAt',
      exchangeLosses: 'id, matchingId, orderId, lossType, anomalyType, calculationDate, status',
      auditLogs: 'id, lossId, operatedAt',
    });
  }

  async clearAll() {
    await Promise.all([
      this.customerOrders.clear(),
      this.bankStatements.clear(),
      this.platformBills.clear(),
      this.exchangeRates.clear(),
      this.matchingRecords.clear(),
      this.exchangeLosses.clear(),
      this.auditLogs.clear(),
    ]);
  }

  async getStats() {
    const [orderCount, statementCount, billCount, lossCount, anomalyCount] = await Promise.all([
      this.customerOrders.count(),
      this.bankStatements.count(),
      this.platformBills.count(),
      this.exchangeLosses.count(),
      this.exchangeLosses.where('anomalyType').notEqual('none').count(),
    ]);

    return {
      orderCount,
      statementCount,
      billCount,
      lossCount,
      anomalyCount,
    };
  }
}

export const db = new ExchangeLossDB();

export async function addAuditLog(
  lossId: string,
  fieldName: string,
  oldValue: string,
  newValue: string,
  remark: string = ''
) {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    lossId,
    fieldName,
    oldValue,
    newValue,
    operator: '当前用户',
    operatedAt: new Date().toISOString(),
    remark,
  };
  await db.auditLogs.add(log);
  return log;
}
