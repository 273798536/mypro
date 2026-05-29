import db from '../api/db/index.js';
import { settlementService } from '../api/services/settlementService.js';
import { exceptionService } from '../api/services/exceptionService.js';
import {
  bulkInsertImpressions,
  bulkInsertClicks,
  bulkInsertConversions,
  checkClickMissing,
} from '../api/dao/dataDao.js';
import { settlementRunDAO } from '../api/dao/settlementRunDAO.js';
import { settlementDetailDAO } from '../api/dao/settlementDetailDAO.js';
import { exceptionRecordDAO } from '../api/dao/exceptionRecordDAO.js';
import type {
  Channel,
  ImpressionLog,
  ClickLog,
  ConversionOrder,
  SettlementRun,
  DiffResult,
  RateHistory,
} from '../shared/types/index.js';

const TEST_CHANNEL_ID = 'channel_test_001';
const TEST_CHANNEL_NAME = '测试渠道-全流程';
const TEST_CHANNEL_ACCOUNT = 'test_account_full_flow';
const TEST_RATE = 0.15;
const START_DATE = '2026-05-19';
const END_DATE = '2026-05-25';

const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/17.0',
];

interface StepResult {
  step: number;
  name: string;
  duration: number;
  success: boolean;
  data?: unknown;
  error?: string;
}

const results: StepResult[] = [];

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateRequestId(): string {
  return `req_${Math.random().toString(36).slice(2, 10)}`;
}

function generateOrderNo(): string {
  return `TEST${Date.now().toString()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
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

async function measureStep<T>(
  stepNum: number,
  stepName: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const startTime = Date.now();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`步骤 ${stepNum}: ${stepName}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    results.push({
      step: stepNum,
      name: stepName,
      duration,
      success: true,
      data: result,
    });

    console.log(`✓ 完成 (耗时: ${duration}ms)`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    results.push({
      step: stepNum,
      name: stepName,
      duration,
      success: false,
      error: errorMsg,
    });

    console.log(`✗ 失败 (耗时: ${duration}ms)`);
    console.log(`  错误: ${errorMsg}`);
    throw error;
  }
}

function printStepData(data: unknown, label?: string): void {
  if (label) {
    console.log(`\n${label}:`);
  }
  if (typeof data === 'object' && data !== null) {
    console.log(JSON.stringify(data, null, 2).split('\n').map((line, i) => i === 0 ? line : `  ${line}`).join('\n'));
  } else {
    console.log(`  ${data}`);
  }
}

function cleanTestData(): void {
  console.log('\n正在清理测试数据...');

  db.prepare('DELETE FROM action_log').run();
  db.prepare('DELETE FROM deduction_item').run();
  db.prepare('DELETE FROM settlement_detail').run();
  db.prepare('DELETE FROM settlement_run').run();
  db.prepare('DELETE FROM exception_record').run();
  db.prepare('DELETE FROM conversion_order').run();
  db.prepare('DELETE FROM click_log').run();
  db.prepare('DELETE FROM impression_log').run();
  db.prepare('DELETE FROM rate_history').run();
  db.prepare('DELETE FROM channel WHERE id = ?').run(TEST_CHANNEL_ID);

  console.log('✓ 测试数据清理完成');
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            广告联盟结算扣量系统 - 全流程测试                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`测试范围: ${START_DATE} 至 ${END_DATE}`);

  cleanTestData();

  try {
    let testChannel: Channel | undefined;

    await measureStep(1, '创建渠道并设置费率', () => {
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO channel (id, name, account, rate, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        TEST_CHANNEL_ID,
        TEST_CHANNEL_NAME,
        TEST_CHANNEL_ACCOUNT,
        TEST_RATE,
        'active',
        now,
        now
      );

      const row = db.prepare('SELECT * FROM channel WHERE id = ?').get(TEST_CHANNEL_ID) as any;
      testChannel = {
        id: row.id,
        name: row.name,
        account: row.account,
        rate: row.rate,
        status: row.status as Channel['status'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      printStepData(testChannel, '创建的渠道信息');
      return testChannel;
    });

    const impressions = await measureStep(2, '导入曝光日志', () => {
      const count = 500;
      const logs: Array<Omit<ImpressionLog, 'createdAt'>> = [];

      for (let i = 0; i < count; i++) {
        const impressionTime = randomDateInRange(START_DATE, END_DATE);
        logs.push({
          id: generateId('imp'),
          channelId: TEST_CHANNEL_ID,
          requestId: generateRequestId(),
          userId: Math.random() > 0.3 ? generateUserId() : undefined,
          ip: generateIp(),
          userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
          impressionTime: impressionTime.toISOString(),
        });
      }

      bulkInsertImpressions(logs);

      const result = {
        imported: logs.length,
        timeRange: logs.length > 0 ? `${logs[0].impressionTime.slice(0, 10)} ~ ${logs[logs.length - 1].impressionTime.slice(0, 10)}` : 'N/A',
      };

      printStepData(result, '导入结果');
      return logs;
    });

    const clicks = await measureStep(3, '导入点击日志（故意制造部分缺失）', () => {
      const totalClicks = 350;
      const missingCount = 80;
      const logs: Array<Omit<ClickLog, 'createdAt'>> = [];

      const shuffledImpressions = [...impressions].sort(() => Math.random() - 0.5);
      const selectedImpressions = shuffledImpressions.slice(0, totalClicks);

      for (let i = 0; i < selectedImpressions.length; i++) {
        const impression = selectedImpressions[i];
        const impressionTime = new Date(impression.impressionTime);
        const clickDelay = 1000 + Math.random() * 300000;
        const clickTime = new Date(impressionTime.getTime() + clickDelay);

        const isAnomaly = Math.random() < 0.05;
        const anomalyReasons = ['点击频率异常', 'IP 地址异常', '设备指纹异常'];

        logs.push({
          id: generateId('clk'),
          channelId: impression.channelId,
          requestId: impression.requestId,
          impressionId: i < missingCount ? undefined : impression.id,
          userId: impression.userId,
          ip: isAnomaly ? '192.168.1.100' : impression.ip,
          userAgent: impression.userAgent,
          clickTime: clickTime.toISOString(),
          isAnomaly,
          anomalyReason: isAnomaly ? anomalyReasons[Math.floor(Math.random() * anomalyReasons.length)] : undefined,
        });
      }

      bulkInsertClicks(logs);

      const anomalyCount = logs.filter(c => c.isAnomaly).length;
      const missingImpressionCount = logs.filter(c => !c.impressionId).length;

      const result = {
        imported: logs.length,
        anomalyCount,
        missingImpressionCount,
        note: `故意制造了 ${missingImpressionCount} 条无曝光关联的点击，用于后续检测`,
      };

      printStepData(result, '导入结果');
      return logs;
    });

    await measureStep(4, '运行点击缺失检测', () => {
      const exception = exceptionService.detectClickMissing(
        TEST_CHANNEL_ID,
        START_DATE,
        END_DATE
      );

      const missingCheck = checkClickMissing(TEST_CHANNEL_ID, START_DATE, END_DATE);

      const result = {
        missingCount: missingCheck.missingCount,
        totalConversions: missingCheck.totalConversions,
        exceptionDetected: exception !== null,
        exception: exception || null,
      };

      printStepData(result, '检测结果');
      return result;
    });

    const conversions = await measureStep(5, '导入转化单（含重复转化）', () => {
      const totalConversions = 80;
      const duplicateCount = 4;
      const orders: Array<Omit<ConversionOrder, 'createdAt'>> = [];
      const usedOrderNos = new Set<string>();

      const normalClicks = clicks.filter(c => !c.isAnomaly && c.impressionId);
      const shuffledClicks = [...normalClicks].sort(() => Math.random() - 0.5);
      const selectedClicks = shuffledClicks.slice(0, totalConversions);

      for (let i = 0; i < selectedClicks.length; i++) {
        const click = selectedClicks[i];
        const clickTime = new Date(click.clickTime);
        const conversionDelay = 60000 + Math.random() * 86400000;
        const conversionTime = new Date(clickTime.getTime() + conversionDelay);

        const isDuplicate = i >= totalConversions - duplicateCount;
        const amount = 10 + Math.random() * 990;

        let orderNo = generateOrderNo();
        while (usedOrderNos.has(orderNo)) {
          orderNo = generateOrderNo();
        }

        usedOrderNos.add(orderNo);

        orders.push({
          id: generateId('conv'),
          channelId: TEST_CHANNEL_ID,
          orderNo,
          clickId: click.id,
          userId: click.userId,
          amount: Number(amount.toFixed(2)),
          conversionTime: conversionTime.toISOString(),
          isDuplicate,
          duplicateReason: isDuplicate ? '重复转化-测试数据（相同用户短时间内多次转化）' : undefined,
        });
      }

      bulkInsertConversions(orders);

      const duplicateOrders = orders.filter(o => o.isDuplicate);
      const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);

      const result = {
        imported: orders.length,
        duplicateCount: duplicateOrders.length,
        totalAmount: totalAmount.toFixed(2),
        note: '标记了 4 条转化为重复转化，用于测试扣量规则',
      };

      printStepData(result, '导入结果');
      return orders;
    });

    const firstRunId = await measureStep(6, '创建第一次结算运行', () => {
      const runId = settlementService.createSettlementRun(
        TEST_CHANNEL_ID,
        START_DATE,
        END_DATE
      );

      const run = settlementRunDAO.findById(runId);
      printStepData(run, '创建的结算运行');
      return runId;
    });

    await measureStep(7, '执行第一次结算', () => {
      settlementService.processSettlement(firstRunId);

      const run = settlementRunDAO.findById(firstRunId);
      const details = settlementDetailDAO.findWithDeductionsByRunId(firstRunId);

      const result = {
        run,
        detailCount: details.length,
        totalDeductions: details.reduce((sum, d) => sum + d.deductions.reduce((s, dd) => s + dd.amount, 0), 0),
      };

      printStepData(result, '结算结果');
      return result;
    });

    await measureStep(8, '补充更多转化单', () => {
      const additionalCount = 25;
      const orders: Array<Omit<ConversionOrder, 'createdAt'>> = [];

      const normalClicks = clicks.filter(c => !c.isAnomaly && c.impressionId);
      const usedClickIds = new Set(conversions.map(c => c.clickId));
      const availableClicks = normalClicks.filter(c => !usedClickIds.has(c.id));

      const selectedClicks = availableClicks.slice(0, additionalCount);

      for (let i = 0; i < selectedClicks.length; i++) {
        const click = selectedClicks[i];
        const clickTime = new Date(click.clickTime);
        const conversionDelay = 60000 + Math.random() * 86400000;
        const conversionTime = new Date(clickTime.getTime() + conversionDelay);

        if (conversionTime > new Date(END_DATE + ' 23:59:59')) {
          conversionTime.setTime(new Date(END_DATE + ' 20:00:00').getTime());
        }

        orders.push({
          id: generateId('conv'),
          channelId: TEST_CHANNEL_ID,
          orderNo: generateOrderNo(),
          clickId: click.id,
          userId: click.userId,
          amount: Number((50 + Math.random() * 500).toFixed(2)),
          conversionTime: conversionTime.toISOString(),
          isDuplicate: false,
        });
      }

      bulkInsertConversions(orders);

      const totalAmount = orders.reduce((sum, o) => sum + o.amount, 0);
      const result = {
        imported: orders.length,
        totalAmount: totalAmount.toFixed(2),
        note: '这些转化将在第二次结算中被计入',
      };

      printStepData(result, '补充转化结果');
      return orders;
    });

    await measureStep(9, '调整费率（制造差异）', () => {
      const now = new Date().toISOString();
      const newRate = 0.18;

      const rateHistoryId = generateId('rate');
      db.prepare(`
        INSERT INTO rate_history (id, channel_id, old_rate, new_rate, effective_date, reason, operator, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rateHistoryId,
        TEST_CHANNEL_ID,
        TEST_RATE,
        newRate,
        '2026-05-22',
        '测试费率调整-全流程测试',
        'test_operator',
        now
      );

      const rateHistory: RateHistory = {
        id: rateHistoryId,
        channelId: TEST_CHANNEL_ID,
        oldRate: TEST_RATE,
        newRate: newRate,
        effectiveDate: '2026-05-22',
        reason: '测试费率调整-全流程测试',
        operator: 'test_operator',
        createdAt: now,
      };

      const result = {
        oldRate: `${(TEST_RATE * 100).toFixed(1)}%`,
        newRate: `${(newRate * 100).toFixed(1)}%`,
        effectiveDate: '2026-05-22',
        note: '费率调整将影响 2026-05-22 及之后的转化结算',
      };

      printStepData(result, '费率调整结果');
      return rateHistory;
    });

    const secondRunId = await measureStep(10, '创建第二次结算运行（以第一次为基线）', () => {
      const runId = settlementService.createSettlementRun(
        TEST_CHANNEL_ID,
        START_DATE,
        END_DATE,
        firstRunId
      );

      const run = settlementRunDAO.findById(runId);
      printStepData(run, '创建的结算运行');
      return runId;
    });

    await measureStep(11, '执行第二次结算', () => {
      settlementService.processSettlement(secondRunId);

      const run = settlementRunDAO.findById(secondRunId);
      const details = settlementDetailDAO.findWithDeductionsByRunId(secondRunId);

      const result = {
        run,
        detailCount: details.length,
        totalDeductions: details.reduce((sum, d) => sum + d.deductions.reduce((s, dd) => s + dd.amount, 0), 0),
      };

      printStepData(result, '结算结果');
      return result;
    });

    const diffs = await measureStep(12, '对比两次运行差异', () => {
      const diffResult = settlementService.compareRuns(secondRunId, firstRunId);

      printStepData({
        diffCount: diffResult.length,
        diffs: diffResult.slice(0, 10),
      }, '差异对比结果');

      if (diffResult.length > 10) {
        console.log(`\n  ... 还有 ${diffResult.length - 10} 条差异未显示`);
      }

      return diffResult;
    });

    await measureStep(13, '验证全链路追踪', () => {
      const exceptions = exceptionRecordDAO.findAll();
      const firstRun = settlementRunDAO.findById(firstRunId);
      const secondRun = settlementRunDAO.findById(secondRunId);
      const firstDetails = settlementDetailDAO.findWithDeductionsByRunId(firstRunId);
      const secondDetails = settlementDetailDAO.findWithDeductionsByRunId(secondRunId);

      let traceVerified = 0;
      let traceFailed = 0;

      for (const detail of secondDetails.slice(0, 5)) {
        const hasTrace = detail.attributionTrace && detail.attributionTrace.length > 0;
        const hasRateSnapshot = detail.rateSnapshot !== undefined;

        if (hasTrace && hasRateSnapshot) {
          traceVerified++;
        } else {
          traceFailed++;
        }
      }

      const result = {
        exceptionCount: exceptions.length,
        firstRunDetails: firstDetails.length,
        secondRunDetails: secondDetails.length,
        traceVerified,
        traceFailed,
        attributionTraceSample: secondDetails[0]?.attributionTrace || [],
        rateSnapshotSample: secondDetails[0]?.rateSnapshot || null,
      };

      printStepData(result, '全链路追踪验证结果');
      return result;
    });

    await measureStep(14, '导出结算明细（CSV格式）', () => {
      const run = settlementRunDAO.findById(secondRunId);
      if (!run) {
        throw new Error('结算运行不存在');
      }

      const details = settlementDetailDAO.findWithDeductionsByRunId(secondRunId);

      const headers = [
        '明细ID', '转化ID', '订单号', '金额', '费率', '佣金',
        '扣款金额', '最终佣金', '扣款原因', '归因状态',
      ];

      const rows = details.map((detail) => {
        const deductionReasons = detail.deductions.map(d => `${d.ruleName}:${d.amount}`).join('; ');
        const hasImpression = detail.attributionTrace.some(n => n.type === 'impression' && n.matched);
        const hasClick = detail.attributionTrace.some(n => n.type === 'click' && n.matched);
        const attributionStatus = [
          hasImpression ? '曝光' : '无曝光',
          hasClick ? '点击' : '无点击',
        ].join(',');

        const conversionRow = db.prepare('SELECT order_no FROM conversion_order WHERE id = ?').get(detail.conversionId) as any;
        const orderNo = conversionRow?.order_no || '';

        return [
          detail.id,
          detail.conversionId,
          orderNo,
          detail.amount.toFixed(2),
          (detail.rate * 100).toFixed(2) + '%',
          detail.commission.toFixed(2),
          detail.deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2),
          detail.finalCommission.toFixed(2),
          deductionReasons || '-',
          attributionStatus,
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const lineCount = rows.length + 1;

      const result = {
        batchNo: run.batchNo,
        lineCount,
        filename: `settlement-${run.batchNo}.csv`,
        preview: csvContent.slice(0, 500) + (csvContent.length > 500 ? '...' : ''),
      };

      printStepData(result, '导出结果');
      return { csvContent, result };
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                       测试执行总结                           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    console.log('\n┌──────────┬──────────────────────────────────┬──────────┬─────────┐');
    console.log('│ 步骤     │ 名称                             │ 耗时(ms) │ 状态    │');
    console.log('├──────────┼──────────────────────────────────┼──────────┼─────────┤');

    let totalDuration = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const result of results) {
      totalDuration += result.duration;
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      const statusSymbol = result.success ? '✓ PASS' : '✗ FAIL';
      const statusColor = result.success ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      console.log(
        `│ ${String(result.step).padEnd(8)} │ ${result.name.padEnd(32)} │ ${String(result.duration).padEnd(8)} │ ${statusColor}${statusSymbol}${resetColor} │`
      );
    }

    console.log('├──────────┼──────────────────────────────────┼──────────┼─────────┤');
    console.log(
      `│ 总计     │ ${String(results.length).padEnd(32)} │ ${String(totalDuration).padEnd(8)} │ ${successCount}/${results.length} │`
    );
    console.log('└──────────┴──────────────────────────────────┴──────────┴─────────┘');

    console.log('\n关键指标总结:');
    const firstRun = settlementRunDAO.findById(firstRunId);
    const secondRun = settlementRunDAO.findById(secondRunId);

    if (firstRun && secondRun) {
      console.log(`  第一次结算:`);
      console.log(`    - 转化数: ${firstRun.totalConversions}`);
      console.log(`    - 总金额: ¥${firstRun.totalAmount.toFixed(2)}`);
      console.log(`    - 扣款金额: ¥${firstRun.deductionAmount.toFixed(2)}`);
      console.log(`    - 最终结算: ¥${firstRun.finalAmount.toFixed(2)}`);

      console.log(`\n  第二次结算:`);
      console.log(`    - 转化数: ${secondRun.totalConversions}`);
      console.log(`    - 总金额: ¥${secondRun.totalAmount.toFixed(2)}`);
      console.log(`    - 扣款金额: ¥${secondRun.deductionAmount.toFixed(2)}`);
      console.log(`    - 最终结算: ¥${secondRun.finalAmount.toFixed(2)}`);

      console.log(`\n  差异:`);
      console.log(`    - 转化数差异: +${secondRun.totalConversions - firstRun.totalConversions}`);
      console.log(`    - 总金额差异: +¥${(secondRun.totalAmount - firstRun.totalAmount).toFixed(2)}`);
      console.log(`    - 最终结算差异: +¥${(secondRun.finalAmount - firstRun.finalAmount).toFixed(2)}`);
      console.log(`    - 检测到的差异项: ${diffs.length} 项`);
    }

    console.log('\n✅ 全流程测试完成！');

  } catch (error) {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n测试执行异常:', error);
  process.exit(1);
});
