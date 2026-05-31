import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type {
  ChannelBill, GameOrder, RefundRecord, RateVersion, OrderCollection, RevenueResult, AnomalyRecord, AuditLog } from '../types';

export class ReconciliationDB extends Dexie {
  channelBills!: Dexie.Table<ChannelBill, string>;
  gameOrders!: Dexie.Table<GameOrder, string>;
  refundRecords!: Dexie.Table<RefundRecord, string>;
  rateVersions!: Dexie.Table<RateVersion, string>;
  orderCollections!: Dexie.Table<OrderCollection, string>;
  revenueResults!: Dexie.Table<RevenueResult, string>;
  anomalyRecords!: Dexie.Table<AnomalyRecord, string>;
  auditLogs!: Dexie.Table<AuditLog, string>;

  constructor() {
    super('GameReconciliationDB');
    this.version(1).stores({
      channelBills: 'id, period, channel, gameId, orderNo, uploadTime, version',
      gameOrders: 'id, period, gameId, serverId, orderNo, uploadTime, version',
      refundRecords: 'id, period, originalOrderNo, serverId, uploadTime, version',
      rateVersions: 'id, channel, gameId, effectiveStart, version, isActive',
      orderCollections: 'id, period, gameId, channel, collectionNo, createTime',
      revenueResults: 'id, period, gameId, channel, collectionId, createTime, hasAnomaly',
      anomalyRecords: 'id, period, type, severity, status, detectedTime',
      auditLogs: 'id, operateTime, operator, operationType, resourceType, resourceId',
    });
  }

  generateId(): string {
    return uuidv4();
  }
}

export const db = new ReconciliationDB();

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

export async function exportAllData(): Promise<string> {
  const data = {
    channelBills: await db.channelBills.toArray(),
    gameOrders: await db.gameOrders.toArray(),
    refundRecords: await db.refundRecords.toArray(),
    rateVersions: await db.rateVersions.toArray(),
    orderCollections: await db.orderCollections.toArray(),
    revenueResults: await db.revenueResults.toArray(),
    anomalyRecords: await db.anomalyRecords.toArray(),
    anomalyRecords2: await db.anomalyRecords.toArray(),
    auditLogs: await db.auditLogs.toArray(),
    exportTime: new Date().toISOString(),
    version: '1.0.0',
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonString: string): Promise<{ success: boolean; count: number }> {
  try {
    const data = JSON.parse(jsonString);
    let count = 0;
    
    await db.transaction('rw', db.tables, async () => {
      if (data.channelBills?.length) {
        await db.channelBills.bulkAdd(data.channelBills);
        count += data.channelBills.length;
      }
      if (data.gameOrders?.length) {
        await db.gameOrders.bulkAdd(data.gameOrders);
        count += data.gameOrders.length;
      }
      if (data.refundRecords?.length) {
        await db.refundRecords.bulkAdd(data.refundRecords);
        count += data.refundRecords.length;
      }
      if (data.rateVersions?.length) {
        await db.rateVersions.bulkAdd(data.rateVersions);
        count += data.rateVersions.length;
      }
      if (data.orderCollections?.length) {
        await db.orderCollections.bulkAdd(data.orderCollections);
        count += data.orderCollections.length;
      }
      if (data.revenueResults?.length) {
        await db.revenueResults.bulkAdd(data.revenueResults);
        count += data.revenueResults.length;
      }
      if (data.anomalyRecords?.length) {
        await db.anomalyRecords.bulkAdd(data.anomalyRecords);
        count += data.anomalyRecords.length;
      }
      if (data.auditLogs?.length) {
        await db.auditLogs.bulkAdd(data.auditLogs);
        count += data.auditLogs.length;
      }
    });
    
    return { success: true, count };
  } catch (error) {
    console.error('Import failed:', error);
    return { success: false, count: 0 };
  }
}
