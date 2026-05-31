import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { ChannelBill, GameOrder, RefundRecord, DataSourceType, UploadResult } from '../types';
import { db } from '../utils/db';
import { generateVersion } from '../utils/format';
import { parseExcelFile } from '../utils/export';
import { useAuthStore } from './auth';
import { auditEngine } from '../engines/auditEngine';

export const useDatasourceStore = defineStore('datasource', () => {
  const authStore = useAuthStore();
  
  const channelBills = ref<ChannelBill[]>([]);
  const gameOrders = ref<GameOrder[]>([]);
  const refundRecords = ref<RefundRecord[]>([]);
  const loading = ref(false);
  const selectedPeriod = ref('');

  const totalRecords = computed(() => ({
    channelBills: channelBills.value.length,
    gameOrders: gameOrders.value.length,
    refundRecords: refundRecords.value.length,
  }));

  const summary = computed(() => ({
    channelBillAmount: channelBills.value.reduce((sum, b) => sum + (b.amount || 0), 0),
    gameOrderAmount: gameOrders.value.reduce((sum, o) => sum + (o.amount || 0), 0),
    refundAmount: refundRecords.value.reduce((sum, r) => sum + (r.amount || 0), 0),
  }));

  const periodList = computed(() => {
    const periods = new Set<string>();
    channelBills.value.forEach(b => periods.add(b.period));
    gameOrders.value.forEach(o => periods.add(o.period));
    refundRecords.value.forEach(r => periods.add(r.period));
    return Array.from(periods).sort().reverse();
  });

  async function loadAll(period?: string) {
    loading.value = true;
    try {
      if (period) {
        selectedPeriod.value = period;
        channelBills.value = await db.channelBills.where('period').equals(period).toArray();
        gameOrders.value = await db.gameOrders.where('period').equals(period).toArray();
        refundRecords.value = await db.refundRecords.where('period').equals(period).toArray();
      } else {
        channelBills.value = await db.channelBills.toArray();
        gameOrders.value = await db.gameOrders.toArray();
        refundRecords.value = await db.refundRecords.toArray();
      }
    } finally {
      loading.value = false;
    }
  }

  async function uploadChannelBills(file: File, period: string, source: string): Promise<UploadResult> {
    return uploadData('channel_bill', file, period, source);
  }

  async function uploadGameOrders(file: File, period: string, source: string): Promise<UploadResult> {
    return uploadData('game_order', file, period, source);
  }

  async function uploadRefundRecords(file: File, period: string, source: string): Promise<UploadResult> {
    return uploadData('refund_record', file, period, source);
  }

  async function uploadData(
    type: DataSourceType,
    file: File,
    period: string,
    source: string
  ): Promise<UploadResult> {
    loading.value = true;
    const version = generateVersion();
    const errors: Array<{ row: number; message: string }> = [];
    let inserted = 0;
    let updated = 0;

    try {
      const rawData = await parseExcelFile(file);
      const uploader = authStore.userName;
      const records: any[] = [];

      for (let i = 0; i < rawData.length; i++) {
        try {
          const row = rawData[i];
          const record = transformRow(type, row, period, source, version, uploader);
          records.push(record);
        } catch (e: any) {
          errors.push({ row: i + 2, message: e.message });
        }
      }

      const existingIds = await getExistingIds(type, records);
      
      for (const record of records) {
        if (existingIds.has(record.orderNo || record.refundNo)) {
          await updateExisting(type, record);
          updated++;
        } else {
          await insertNew(type, record);
          inserted++;
        }
      }

      await auditEngine.log(
        'upload',
        type,
        version,
        uploader,
        '数据源管理',
        undefined,
        { count: records.length, period, source, version },
        `上传${type === 'channel_bill' ? '渠道账单' : type === 'game_order' ? '游戏订单' : '退款记录'}`
      );

      await loadAll(selectedPeriod.value || undefined);

      return {
        success: errors.length === 0,
        total: rawData.length,
        inserted,
        updated,
        errors,
        version,
      };
    } catch (e: any) {
      return {
        success: false,
        total: 0,
        inserted: 0,
        updated: 0,
        errors: [{ row: 0, message: e.message }],
        version,
      };
    } finally {
      loading.value = false;
    }
  }

  function transformRow(
    type: DataSourceType,
    row: any,
    period: string,
    source: string,
    version: string,
    uploader: string
  ): any {
    const base = {
      id: uuidv4(),
      type,
      source,
      version,
      versionStatus: 'active' as const,
      uploadTime: new Date().toISOString(),
      uploadBy: uploader,
      period,
    };

    if (type === 'channel_bill') {
      return {
        ...base,
        channel: row['渠道'] || row['channel'] || 'apple',
        gameId: row['游戏ID'] || row['gameId'] || 'G001',
        gameName: row['游戏名称'] || row['gameName'] || '未知游戏',
        orderNo: row['订单号'] || row['orderNo'] || '',
        amount: Number(row['金额'] || row['amount'] || 0),
        currency: row['币种'] || row['currency'] || 'CNY',
        transactionTime: row['交易时间'] || row['transactionTime'] || new Date().toISOString(),
        channelFee: Number(row['渠道费'] || row['channelFee'] || 0),
        channelOrderNo: row['渠道订单号'] || row['channelOrderNo'] || '',
      };
    }

    if (type === 'game_order') {
      return {
        ...base,
        gameId: row['游戏ID'] || row['gameId'] || 'G001',
        gameName: row['游戏名称'] || row['gameName'] || '未知游戏',
        serverId: row['服务器ID'] || row['serverId'] || 'S001',
        serverName: row['服务器名称'] || row['serverName'] || '未知服务器',
        orderNo: row['订单号'] || row['orderNo'] || '',
        userId: row['用户ID'] || row['userId'] || '',
        amount: Number(row['金额'] || row['amount'] || 0),
        currency: row['币种'] || row['currency'] || 'CNY',
        payTime: row['支付时间'] || row['payTime'] || new Date().toISOString(),
        itemId: row['商品ID'] || row['itemId'] || '',
        itemName: row['商品名称'] || row['itemName'] || '',
        channel: row['渠道'] || row['channel'] || 'apple',
        channelOrderNo: row['渠道订单号'] || row['channelOrderNo'],
      };
    }

    if (type === 'refund_record') {
      return {
        ...base,
        refundNo: row['退款单号'] || row['refundNo'] || '',
        originalOrderNo: row['原订单号'] || row['originalOrderNo'] || '',
        gameId: row['游戏ID'] || row['gameId'] || 'G001',
        gameName: row['游戏名称'] || row['gameName'] || '未知游戏',
        serverId: row['服务器ID'] || row['serverId'] || 'S001',
        serverName: row['服务器名称'] || row['serverName'] || '未知服务器',
        userId: row['用户ID'] || row['userId'] || '',
        amount: Number(row['退款金额'] || row['amount'] || 0),
        currency: row['币种'] || row['currency'] || 'CNY',
        refundTime: row['退款时间'] || row['refundTime'] || new Date().toISOString(),
        refundReason: row['退款原因'] || row['refundReason'] || '',
        channel: row['渠道'] || row['channel'] || 'apple',
      };
    }

    throw new Error('Unknown data type');
  }

  async function getExistingIds(type: DataSourceType, records: any[]): Promise<Set<string>> {
    const ids = new Set<string>();
    let existing: any[] = [];

    if (type === 'channel_bill') {
      existing = await db.channelBills.where('period').equals(records[0]?.period || '').toArray();
      existing.forEach(r => ids.add(r.orderNo));
    } else if (type === 'game_order') {
      existing = await db.gameOrders.where('period').equals(records[0]?.period || '').toArray();
      existing.forEach(r => ids.add(r.orderNo));
    } else if (type === 'refund_record') {
      existing = await db.refundRecords.where('period').equals(records[0]?.period || '').toArray();
      existing.forEach(r => ids.add(r.refundNo));
    }

    return ids;
  }

  async function insertNew(type: DataSourceType, record: any) {
    if (type === 'channel_bill') {
      await db.channelBills.add(record);
    } else if (type === 'game_order') {
      await db.gameOrders.add(record);
    } else if (type === 'refund_record') {
      await db.refundRecords.add(record);
    }
  }

  async function updateExisting(type: DataSourceType, record: any) {
    let existing: any;
    if (type === 'channel_bill') {
      existing = await db.channelBills.where('orderNo').equals(record.orderNo).first();
      if (existing) {
        await db.channelBills.update(existing.id, { ...record, versionStatus: 'archived' });
        record.id = existing.id;
        await db.channelBills.add(record);
      }
    } else if (type === 'game_order') {
      existing = await db.gameOrders.where('orderNo').equals(record.orderNo).first();
      if (existing) {
        await db.gameOrders.update(existing.id, { ...existing, versionStatus: 'archived' });
        record.id = existing.id;
        await db.gameOrders.add(record);
      }
    } else if (type === 'refund_record') {
      existing = await db.refundRecords.where('refundNo').equals(record.refundNo).first();
      if (existing) {
        await db.refundRecords.update(existing.id, { ...existing, versionStatus: 'archived' });
        record.id = existing.id;
        await db.refundRecords.add(record);
      }
    }
  }

  async function deleteRecord(type: DataSourceType, id: string) {
    const authStore = useAuthStore();
    let beforeChange: any;

    if (type === 'channel_bill') {
      beforeChange = await db.channelBills.get(id);
      await db.channelBills.delete(id);
    } else if (type === 'game_order') {
      beforeChange = await db.gameOrders.get(id);
      await db.gameOrders.delete(id);
    } else if (type === 'refund_record') {
      beforeChange = await db.refundRecords.get(id);
      await db.refundRecords.delete(id);
    }

    await auditEngine.log(
      'delete',
      type,
      id,
      authStore.userName,
      '数据源管理',
      beforeChange,
      undefined,
      `删除${type === 'channel_bill' ? '渠道账单' : type === 'game_order' ? '游戏订单' : '退款记录'}`
    );

    await loadAll(selectedPeriod.value || undefined);
  }

  function getVersionHistory(type: DataSourceType, key: string) {
    if (type === 'channel_bill') {
      return channelBills.value.filter(b => b.orderNo === key);
    } else if (type === 'game_order') {
      return gameOrders.value.filter(o => o.orderNo === key);
    } else {
      return refundRecords.value.filter(r => r.refundNo === key);
    }
  }

  return {
    channelBills,
    gameOrders,
    refundRecords,
    loading,
    selectedPeriod,
    totalRecords,
    summary,
    periodList,
    loadAll,
    uploadChannelBills,
    uploadGameOrders,
    uploadRefundRecords,
    deleteRecord,
    getVersionHistory,
  };
});
