import { v4 as uuidv4 } from 'uuid';
import type { ChannelBill, GameOrder, RefundRecord, RateVersion } from '../types';
import { db } from '../utils/db';
import { generatePeriod } from '../utils/format';

const PERIOD = generatePeriod();
const PREV_PERIOD = '2026-04';

const CHANNELS: Array<{ id: string; label: string }> = [
  { id: 'apple', label: 'App Store' },
  { id: 'google', label: 'Google Play' },
  { id: 'taptap', label: 'TapTap' },
];

const GAMES = [
  { id: 'G001', name: '王者荣耀' },
  { id: 'G002', name: '和平精英' },
  { id: 'G003', name: '原神' },
];

const SERVERS = [
  { id: 'S001', name: '一区-荣耀' },
  { id: 'S002', name: '二区-传奇' },
  { id: 'S003', name: '三区-王者' },
  { id: 'S004', name: '四区-巅峰' },
];

const ITEMS = [
  { id: 'I001', name: '648钻石礼包', amount: 648.00 },
  { id: 'I002', name: '328钻石礼包', amount: 328.00 },
  { id: 'I003', name: '198月卡', amount: 198.00 },
  { id: 'I004', name: '68周卡', amount: 68.00 },
  { id: 'I005', name: '30月卡', amount: 30.00 },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(): number {
  return randomItem(ITEMS).amount;
}

export async function generateMockData() {
  const existing = await db.channelBills.count();
  if (existing > 0) {
    return { loaded: true, count: existing };
  }

  const channelBills: ChannelBill[] = [];
  const gameOrders: GameOrder[] = [];
  const refundRecords: RefundRecord[] = [];
  const rateVersions: RateVersion[] = [];

  for (const game of GAMES) {
    for (const channel of CHANNELS) {
      rateVersions.push({
        id: uuidv4(),
        version: 'v1.0',
        channel: channel.id as any,
        gameId: game.id,
        gameName: game.name,
        effectiveStart: '2026-01-01',
        effectiveEnd: '2026-06-30',
        channelRate: 0.3,
        platformRate: 0.3,
        developerRate: 0.4,
        isActive: true,
        createTime: new Date().toISOString(),
        createBy: '系统管理员',
      });

      rateVersions.push({
        id: uuidv4(),
        version: 'v1.1',
        channel: channel.id as any,
        gameId: game.id,
        gameName: game.name,
        effectiveStart: '2026-05-01',
        effectiveEnd: '2026-12-31',
        channelRate: 0.25,
        platformRate: 0.35,
        developerRate: 0.4,
        isActive: true,
        createTime: new Date().toISOString(),
        createBy: '系统管理员',
      });
    }
  }

  for (let i = 1; i <= 50; i++) {
    const game = randomItem(GAMES);
    const channel = randomItem(CHANNELS);
    const item = randomItem(ITEMS);
    const server = randomItem(SERVERS);
    const orderNo = `ORD${PERIOD.replace(/-/g, '')}${String(i).padStart(6, '0')}`;
    const channelOrderNo = `CH${Date.now()}${i}`;
    const transactionTime = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();

    channelBills.push({
      id: uuidv4(),
      type: 'channel_bill',
      source: `${channel.label}后台导出`,
      version: '20260531-120000',
      versionStatus: 'active',
      uploadTime: new Date().toISOString(),
      uploadBy: '财务管理员',
      period: PERIOD,
      channel: channel.id as any,
      gameId: game.id,
      gameName: game.name,
      orderNo,
      amount: item.amount,
      currency: 'CNY',
      transactionTime,
      channelFee: Number((item.amount * 0.3).toFixed(2)),
      channelOrderNo,
    });

    gameOrders.push({
      id: uuidv4(),
      type: 'game_order',
      source: '游戏后台同步',
      version: '20260531-120000',
      versionStatus: 'active',
      uploadTime: new Date().toISOString(),
      uploadBy: '财务管理员',
      period: PERIOD,
      gameId: game.id,
      gameName: game.name,
      serverId: server.id,
      serverName: server.name,
      orderNo,
      userId: `U${String(10000 + i).padStart(6, '0')}`,
      amount: item.amount,
      currency: 'CNY',
      payTime: transactionTime,
      itemId: item.id,
      itemName: item.name,
      channel: channel.id as any,
      channelOrderNo,
    });
  }

  for (let i = 1; i <= 8; i++) {
    const game = randomItem(GAMES);
    const channel = randomItem(CHANNELS);
    const originalOrder = gameOrders[Math.floor(Math.random() * gameOrders.length)];
    const refundServer = i === 3 ? randomItem(SERVERS.filter(s => s.id !== originalOrder.serverId)) : randomItem(SERVERS);
    
    refundRecords.push({
      id: uuidv4(),
      type: 'refund_record',
      source: '客服系统导出',
      version: '20260531-120000',
      versionStatus: 'active',
      uploadTime: new Date().toISOString(),
      uploadBy: '财务管理员',
      period: PERIOD,
      refundNo: `REF${PERIOD.replace(/-/g, '')}${String(i).padStart(4, '0')}`,
      originalOrderNo: originalOrder.orderNo,
      gameId: game.id,
      gameName: game.name,
      serverId: i === 3 ? refundServer.id : originalOrder.serverId,
      serverName: i === 3 ? refundServer.name : originalOrder.serverName,
      userId: originalOrder.userId,
      amount: originalOrder.amount,
      currency: 'CNY',
      refundTime: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
      refundReason: i === 3 ? '误充值申请退款' : randomItem(['充值未到账', '商品质量问题', '误操作', '其他']),
      channel: channel.id as any,
    });
  }

  await db.transaction('rw', [
    db.channelBills, db.gameOrders, db.refundRecords, db.rateVersions, db.auditLogs
  ], async () => {
    await db.rateVersions.bulkAdd(rateVersions);
    await db.channelBills.bulkAdd(channelBills);
    await db.gameOrders.bulkAdd(gameOrders);
    await db.refundRecords.bulkAdd(refundRecords);
    
    await db.auditLogs.add({
      id: uuidv4(),
      operationType: 'upload',
      operator: '系统',
      operateTime: new Date().toISOString(),
      module: '初始化',
      resourceId: 'mock-data',
      resourceType: 'system',
      afterChange: { count: channelBills.length + gameOrders.length + refundRecords.length },
      changeReason: '系统初始化演示数据',
    });
  });

  return {
    loaded: true,
    channelBills: channelBills.length,
    gameOrders: gameOrders.length,
    refundRecords: refundRecords.length,
    rateVersions: rateVersions.length,
  };
}

export const mockDataConfig = {
  period: PERIOD,
  prevPeriod: PREV_PERIOD,
  channels: CHANNELS,
  games: GAMES,
  servers: SERVERS,
  items: ITEMS,
};
