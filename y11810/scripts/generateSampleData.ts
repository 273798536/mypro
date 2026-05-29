import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../api/db/index.js';
import { channels } from '../api/db/seed.js';
import {
  bulkInsertImpressions,
  bulkInsertClicks,
  bulkInsertConversions,
} from '../api/dao/dataDao.js';
import { settlementService } from '../api/services/settlementService.js';
import type {
  ImpressionLog,
  ClickLog,
  ConversionOrder,
  Channel,
} from '../shared/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');

const START_DATE = '2026-05-19';
const END_DATE = '2026-05-25';
const IMPRESSION_COUNT = 1000;
const CLICK_COUNT = 800;
const CONVERSION_COUNT = 150;
const ANOMALY_RATE = 0.05;
const DUPLICATE_RATE = 0.05;

const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/17.0',
  'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/119.0.0.0',
];

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function generateOrderNo(): string {
  return `ORD${Date.now().toString()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function generateIp(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateUserId(): string {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

function randomDateInRange(start: string, end: string): Date {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end + ' 23:59:59').getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

function randomChannel(): Channel {
  return channels[Math.floor(Math.random() * channels.length)] as Channel;
}

function generateImpressions(count: number): Array<Omit<ImpressionLog, 'createdAt'>> {
  const impressions: Array<Omit<ImpressionLog, 'createdAt'>> = [];

  for (let i = 0; i < count; i++) {
    const channel = randomChannel();
    const impressionTime = randomDateInRange(START_DATE, END_DATE);

    impressions.push({
      id: generateId('imp'),
      channelId: channel.id,
      requestId: generateRequestId(),
      userId: Math.random() > 0.3 ? generateUserId() : undefined,
      ip: generateIp(),
      userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
      impressionTime: impressionTime.toISOString(),
    });
  }

  return impressions.sort((a, b) =>
    new Date(a.impressionTime).getTime() - new Date(b.impressionTime).getTime()
  );
}

function generateClicks(
  impressions: Array<Omit<ImpressionLog, 'createdAt'>>,
  count: number,
  anomalyRate: number
): Array<Omit<ClickLog, 'createdAt'>> {
  const clicks: Array<Omit<ClickLog, 'createdAt'>> = [];
  const shuffledImpressions = [...impressions].sort(() => Math.random() - 0.5);
  const selectedImpressions = shuffledImpressions.slice(0, count);

  for (let i = 0; i < selectedImpressions.length; i++) {
    const impression = selectedImpressions[i];
    const impressionTime = new Date(impression.impressionTime);
    const clickDelay = 1000 + Math.random() * 300000;
    const clickTime = new Date(impressionTime.getTime() + clickDelay);

    const isAnomaly = Math.random() < anomalyRate;
    const anomalyReasons = ['点击频率异常', 'IP 地址异常', '设备指纹异常', '点击时间异常'];

    clicks.push({
      id: generateId('clk'),
      channelId: impression.channelId,
      requestId: impression.requestId,
      impressionId: impression.id,
      userId: impression.userId,
      ip: isAnomaly ? '192.168.1.100' : impression.ip,
      userAgent: impression.userAgent,
      clickTime: clickTime.toISOString(),
      isAnomaly,
      anomalyReason: isAnomaly ? anomalyReasons[Math.floor(Math.random() * anomalyReasons.length)] : undefined,
    });
  }

  return clicks.sort((a, b) =>
    new Date(a.clickTime).getTime() - new Date(b.clickTime).getTime()
  );
}

function generateConversions(
  clicks: Array<Omit<ClickLog, 'createdAt'>>,
  count: number,
  duplicateRate: number
): Array<Omit<ConversionOrder, 'createdAt'>> {
  const conversions: Array<Omit<ConversionOrder, 'createdAt'>> = [];
  const normalClicks = clicks.filter(c => !c.isAnomaly);
  const shuffledClicks = [...normalClicks].sort(() => Math.random() - 0.5);
  const selectedClicks = shuffledClicks.slice(0, count);
  const usedOrderNos = new Set<string>();

  for (let i = 0; i < selectedClicks.length; i++) {
    const click = selectedClicks[i];
    const clickTime = new Date(click.clickTime);
    const conversionDelay = 60000 + Math.random() * 86400000;
    const conversionTime = new Date(clickTime.getTime() + conversionDelay);

    const isDuplicate = Math.random() < duplicateRate;
    const amount = 10 + Math.random() * 990;

    let orderNo = generateOrderNo();
    while (usedOrderNos.has(orderNo)) {
      orderNo = generateOrderNo();
    }

    if (isDuplicate && conversions.length > 0) {
      const existingConversion = conversions[Math.floor(Math.random() * conversions.length)];
      orderNo = existingConversion.orderNo;
    }

    usedOrderNos.add(orderNo);

    conversions.push({
      id: generateId('conv'),
      channelId: click.channelId,
      orderNo,
      clickId: click.id,
      userId: click.userId,
      amount: Number(amount.toFixed(2)),
      conversionTime: conversionTime.toISOString(),
      isDuplicate,
      duplicateReason: isDuplicate ? '重复订单号' : undefined,
    });
  }

  return conversions.sort((a, b) =>
    new Date(a.conversionTime).getTime() - new Date(b.conversionTime).getTime()
  );
}

function saveSampleData(
  data: {
    impressions: Array<Omit<ImpressionLog, 'createdAt'>>;
    clicks: Array<Omit<ClickLog, 'createdAt'>>;
    conversions: Array<Omit<ConversionOrder, 'createdAt'>>;
    channels: typeof channels;
    firstSettlementRunId?: string;
    secondSettlementRunId?: string;
  },
  filePath: string
): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n示例数据已保存到: ${filePath}`);
}

function insertDataToDb(
  impressions: Array<Omit<ImpressionLog, 'createdAt'>>,
  clicks: Array<Omit<ClickLog, 'createdAt'>>,
  conversions: Array<Omit<ConversionOrder, 'createdAt'>>
): void {
  console.log('\n正在插入数据到数据库...');

  db.prepare('DELETE FROM settlement_detail').run();
  db.prepare('DELETE FROM deduction_item').run();
  db.prepare('DELETE FROM settlement_run').run();
  db.prepare('DELETE FROM conversion_order').run();
  db.prepare('DELETE FROM click_log').run();
  db.prepare('DELETE FROM impression_log').run();
  db.prepare('DELETE FROM rate_history').run();
  db.prepare('DELETE FROM exception_record').run();
  db.prepare('DELETE FROM action_log').run();

  bulkInsertImpressions(impressions);
  console.log(`  ✓ 插入 ${impressions.length} 条曝光日志`);

  bulkInsertClicks(clicks);
  console.log(`  ✓ 插入 ${clicks.length} 条点击日志`);

  bulkInsertConversions(conversions);
  console.log(`  ✓ 插入 ${conversions.length} 条转化单`);

  console.log('\n数据插入完成！');
}

function runFirstSettlement(): string {
  console.log('\n========== 第一次结算 ==========');
  const channel = channels[0];

  const runId = settlementService.createSettlementRun(
    channel.id,
    START_DATE,
    END_DATE
  );

  console.log(`创建结算运行: ${runId}`);

  settlementService.processSettlement(runId);

  const stmt = db.prepare('SELECT * FROM settlement_run WHERE id = ?');
  const run = stmt.get(runId) as any;

  console.log(`结算完成:`);
  console.log(`  总曝光: ${run.total_impressions}`);
  console.log(`  总点击: ${run.total_clicks}`);
  console.log(`  总转化: ${run.total_conversions}`);
  console.log(`  总金额: ¥${run.total_amount.toFixed(2)}`);
  console.log(`  扣款金额: ¥${run.deduction_amount.toFixed(2)}`);
  console.log(`  最终结算: ¥${run.final_amount.toFixed(2)}`);

  return runId;
}

function modifyDataForSecondSettlement(
  conversions: Array<Omit<ConversionOrder, 'createdAt'>>
): Array<Omit<ConversionOrder, 'createdAt'>> {
  console.log('\n正在修改数据以制造结算差异...');

  const channel = channels[0];
  const newRate = 0.18;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO rate_history (id, channel_id, old_rate, new_rate, effective_date, reason, operator, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateId('rate'),
    channel.id,
    0.15,
    newRate,
    '2026-05-22',
    '结算中调整费率',
    'system',
    now
  );
  console.log('  ✓ 调整渠道费率从 15% 到 18%（生效日期 2026-05-22）');

  const rule = db.prepare("SELECT * FROM deduction_rule WHERE id = 'rule_001'").get() as any;
  if (rule) {
    db.prepare(`
      UPDATE deduction_rule 
      SET deduction_rate = 0.8, version = 2, updated_at = ?
      WHERE id = 'rule_001'
    `).run(now);
    console.log('  ✓ 修改异常点击扣量规则：扣量比例从 100% 改为 80%');
  }

  const newConversions: Array<Omit<ConversionOrder, 'createdAt'>> = [];
  const normalClicks = db.prepare(`
    SELECT * FROM click_log 
    WHERE channel_id = ? AND is_anomaly = 0
    AND click_time >= ? AND click_time <= ?
  `).all(channel.id, START_DATE, END_DATE + ' 23:59:59') as any[];

  for (let i = 0; i < 20; i++) {
    const click = normalClicks[Math.floor(Math.random() * normalClicks.length)];
    const clickTime = new Date(click.click_time);
    const conversionDelay = 60000 + Math.random() * 86400000;
    const conversionTime = new Date(clickTime.getTime() + conversionDelay);

    if (conversionTime > new Date(END_DATE + ' 23:59:59')) {
      conversionTime.setTime(new Date(END_DATE + ' 20:00:00').getTime());
    }

    newConversions.push({
      id: generateId('conv'),
      channelId: click.channel_id,
      orderNo: generateOrderNo(),
      clickId: click.id,
      userId: click.user_id ?? undefined,
      amount: Number((50 + Math.random() * 500).toFixed(2)),
      conversionTime: conversionTime.toISOString(),
      isDuplicate: false,
    });
  }

  bulkInsertConversions(newConversions);
  console.log(`  ✓ 新增 ${newConversions.length} 条转化单`);

  return [...conversions, ...newConversions];
}

function runSecondSettlement(baseRunId: string): string {
  console.log('\n========== 第二次结算（基线对比） ==========');
  const channel = channels[0];

  const runId = settlementService.createSettlementRun(
    channel.id,
    START_DATE,
    END_DATE,
    baseRunId
  );

  console.log(`创建结算运行: ${runId} (基线: ${baseRunId})`);

  settlementService.processSettlement(runId);

  const stmt = db.prepare('SELECT * FROM settlement_run WHERE id = ?');
  const run = stmt.get(runId) as any;

  console.log(`结算完成:`);
  console.log(`  总曝光: ${run.total_impressions}`);
  console.log(`  总点击: ${run.total_clicks}`);
  console.log(`  总转化: ${run.total_conversions}`);
  console.log(`  总金额: ¥${run.total_amount.toFixed(2)}`);
  console.log(`  扣款金额: ¥${run.deduction_amount.toFixed(2)}`);
  console.log(`  最终结算: ¥${run.final_amount.toFixed(2)}`);

  return runId;
}

function compareSettlements(runId: string, baseRunId: string): void {
  console.log('\n========== 结算差异对比 ==========');

  const diffs = settlementService.compareRuns(runId, baseRunId);

  console.log(`发现 ${diffs.length} 处差异:\n`);

  for (const diff of diffs) {
    const changeSymbol = diff.changeType === 'added' ? '+' : diff.changeType === 'removed' ? '-' : '~';
    console.log(`${changeSymbol} ${diff.field}: ${JSON.stringify(diff.oldValue)} -> ${JSON.stringify(diff.newValue)}`);
    if (diff.reason) {
      console.log(`  原因: ${diff.reason}`);
    }
    console.log('');
  }
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  广告联盟结算扣量系统 - 示例数据生成');
  console.log('========================================');

  console.log('\n数据范围:');
  console.log(`  日期: ${START_DATE} 至 ${END_DATE}`);
  console.log(`  渠道数: ${channels.length}`);
  console.log(`  曝光日志: ${IMPRESSION_COUNT} 条`);
  console.log(`  点击日志: ${CLICK_COUNT} 条（含 ${(ANOMALY_RATE * 100).toFixed(0)}% 异常点击）`);
  console.log(`  转化单: ${CONVERSION_COUNT} 条（含 ${(DUPLICATE_RATE * 100).toFixed(0)}% 重复转化）`);

  console.log('\n正在生成示例数据...');

  const impressions = generateImpressions(IMPRESSION_COUNT);
  console.log(`  ✓ 生成 ${impressions.length} 条曝光日志`);

  const clicks = generateClicks(impressions, CLICK_COUNT, ANOMALY_RATE);
  console.log(`  ✓ 生成 ${clicks.length} 条点击日志`);
  console.log(`    - 异常点击: ${clicks.filter(c => c.isAnomaly).length} 条`);

  let conversions = generateConversions(clicks, CONVERSION_COUNT, DUPLICATE_RATE);
  console.log(`  ✓ 生成 ${conversions.length} 条转化单`);
  console.log(`    - 重复转化: ${conversions.filter(c => c.isDuplicate).length} 条`);

  const sampleDataPath = path.join(dataDir, 'sample_data.json');

  const args = process.argv.slice(2);
  const shouldInsert = args.includes('--insert') || args.includes('-i');

  if (shouldInsert) {
    insertDataToDb(impressions, clicks, conversions);

    const firstRunId = runFirstSettlement();

    conversions = modifyDataForSecondSettlement(conversions);

    const secondRunId = runSecondSettlement(firstRunId);

    compareSettlements(secondRunId, firstRunId);

    saveSampleData(
      {
        impressions,
        clicks,
        conversions,
        channels,
        firstSettlementRunId: firstRunId,
        secondSettlementRunId: secondRunId,
      },
      sampleDataPath
    );
  } else {
    saveSampleData(
      {
        impressions,
        clicks,
        conversions,
        channels,
      },
      sampleDataPath
    );

    console.log('\n提示: 使用 --insert 或 -i 参数可将数据直接插入数据库');
  }

  console.log('\n========================================');
  console.log('  示例数据生成完成！');
  console.log('========================================');
}

main().catch((error) => {
  console.error('\n生成失败:', error);
  process.exit(1);
});
