const store = require('./models/store');
const sampleService = require('./services/sampleService');
const alertService = require('./services/alertService');
const queueService = require('./services/queueService');
const reportService = require('./services/reportService');

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function printSubHeader(title) {
  console.log(`\n--- ${title} ---`);
}

function run() {
  printHeader('酒店押金释放队列 - 端到端测试');

  let db = store.loadDB();

  printSubHeader('0. 清理历史数据');
  sampleService.clearAll(db);
  console.log('✓ 数据已清空');

  printSubHeader('1. 导入样例数据');
  db = store.loadDB();
  const importResult = sampleService.importSamples(db);
  store.saveDB(db);
  console.log(JSON.stringify(importResult, null, 2));

  printSubHeader('2. 初始状态检查');
  db = store.loadDB();
  console.log(`订单数: ${db.orders.length}`);
  console.log(`押金流水: ${db.depositFlows.length}`);
  console.log(`客损单: ${db.damageReports.length}`);
  console.log(`渠道回执: ${db.channelReceipts.length}`);

  printSubHeader('3. 构建释放队列');
  db = store.loadDB();
  const queue = queueService.buildQueue(db);
  console.log(`队列长度: ${queue.length}`);
  for (const item of queue) {
    const status = item.canRelease ? '✓ 可释放' : '✗ 阻塞';
    const issues = item.issues.length > 0 ? ` [问题: ${item.issues.join(', ')}]` : '';
    console.log(`  ${status} - 订单${item.orderId} ${item.customerName} 房间${item.roomNo} ${item.channel}`);
    console.log(`    押金¥${item.depositAmount} - 客损¥${item.totalDamage} - 延迟¥${item.lateFee} = 释放¥${item.releaseAmount}${issues}`);
    console.log(`    渠道回执状态: ${item.receiptStatus}`);
  }

  printSubHeader('4. 检测告警');
  db = store.loadDB();
  alertService.mergeAndSaveAlerts(db);
  store.saveDB(db);
  db = store.loadDB();
  const alerts = db.alerts.filter(a => !a.resolved);
  console.log(`告警数量: ${alerts.length}`);
  for (const a of alerts) {
    console.log(`  [${a.severity.toUpperCase()}] ${a.message}`);
  }

  printSubHeader('5. 处理第一条正常记录 (ORD_001_NORMAL)');
  db = store.loadDB();
  const normalQueue = queueService.buildQueue(db);
  const normalItem = normalQueue.find(q => q.orderId === 'ORD_001_NORMAL');
  if (normalItem && normalItem.canRelease) {
    queueService.lockDeposit(db, normalItem.depositFlowId);
    const release = queueService.processRelease(db, normalItem);
    queueService.completeRelease(db, release.id);
    store.saveDB(db);
    console.log(`✓ ORD_001_NORMAL 已释放 ¥${normalItem.releaseAmount}`);
    console.log(`  释放单号: ${release.id}`);
  }

  printSubHeader('6. 处理第二条边界记录 (ORD_002_BOUNDARY)');
  db = store.loadDB();
  const boundaryQueue = queueService.buildQueue(db);
  const boundaryItem = boundaryQueue.find(q => q.orderId === 'ORD_002_BOUNDARY');
  console.log(`订单信息: ${boundaryItem.customerName} 房间${boundaryItem.roomNo}`);
  console.log(`押金¥${boundaryItem.depositAmount} - 客损¥${boundaryItem.totalDamage} - 延迟退房¥${boundaryItem.lateFee} = 释放¥${boundaryItem.releaseAmount}`);
  console.log(`当前问题: ${boundaryItem.issues.join(', ')}`);
  console.log(`渠道回执: ${boundaryItem.receiptStatus}`);

  printSubHeader('6a. 先抵扣客损');
  const damage = db.damageReports.find(d => d.orderId === 'ORD_002_BOUNDARY');
  const deductResult = queueService.deductDamage(db, 'ORD_002_BOUNDARY', damage.id);
  store.saveDB(db);
  console.log(`✓ 客损单 ${damage.id} 已抵扣 ¥${damage.amount}`);

  printSubHeader('6b. 再检查渠道回执');
  const receipt = db.channelReceipts.find(r => r.orderId === 'ORD_002_BOUNDARY');
  if (!receipt) {
    console.log('⚠ 渠道回执缺失，模拟从渠道获取回执');
    const preAuthFlow = db.depositFlows.find(
      f => f.orderId === 'ORD_002_BOUNDARY' && f.type === 'pre_authorize'
    );
    db.channelReceipts.push({
      id: store.genId('REC'),
      orderId: 'ORD_002_BOUNDARY',
      channel: 'meituan',
      channelRef: preAuthFlow.channelRef,
      receiptTime: store.nowIso(),
      status: 'confirmed',
      rawResponse: '{"code":"0","msg":"success","releaseAmount":1050}'
    });
    store.saveDB(db);
    console.log('✓ 渠道回执已记录');
  }

  printSubHeader('6c. 执行释放');
  db = store.loadDB();
  const boundaryQueue2 = queueService.buildQueue(db);
  const boundaryItem2 = boundaryQueue2.find(q => q.orderId === 'ORD_002_BOUNDARY');
  if (boundaryItem2 && boundaryItem2.canRelease) {
    queueService.lockDeposit(db, boundaryItem2.depositFlowId);
    const release2 = queueService.processRelease(db, boundaryItem2);
    queueService.completeRelease(db, release2.id);
    store.saveDB(db);
    console.log(`✓ ORD_002_BOUNDARY 已释放 ¥${boundaryItem2.releaseAmount}`);
    console.log(`  释放单号: ${release2.id}`);
  } else {
    console.log('✗ 仍存在问题，无法释放:', boundaryItem2 ? boundaryItem2.issues : '未找到');
  }

  printSubHeader('7. 处理第三条坏数据 (ORD_003_BAD)');
  db = store.loadDB();
  const badQueue = queueService.buildQueue(db);
  const badItem = badQueue.find(q => q.orderId === 'ORD_003_BAD');
  if (badItem) {
    console.log(`订单信息: ${badItem.customerName} 房间${badItem.roomNo}`);
    console.log(`押金¥${badItem.depositAmount} - 客损¥${badItem.totalDamage} - 延迟¥${badItem.lateFee} = 释放¥${badItem.releaseAmount}`);
    console.log(`当前问题: ${badItem.issues.join(', ')}`);

    if (!badItem.canRelease) {
      console.log('⚠ 此订单有严重问题，不能正常释放:');
      for (const issue of badItem.issues) {
        if (issue === 'damage_pending') {
          const dmg = db.damageReports.find(d => d.orderId === 'ORD_003_BAD');
          console.log(`  - 客损未处理: ¥${dmg.amount}（押金仅 ¥${badItem.depositAmount}，缺口 ¥${dmg.amount - badItem.depositAmount}）`);
        }
        if (issue === 'deposit_shortage') {
          console.log(`  - 押金不足: 客损+延迟退房 ¥${badItem.totalDamage + badItem.lateFee} 超过押金 ¥${badItem.depositAmount}`);
        }
      }
      console.log('✗ 此订单需人工介入处理，不应自动释放');
    }
  }

  printSubHeader('8. 重新检测告警');
  db = store.loadDB();
  alertService.mergeAndSaveAlerts(db);
  store.saveDB(db);
  db = store.loadDB();
  const finalAlerts = db.alerts.filter(a => !a.resolved);
  console.log(`未解决告警: ${finalAlerts.length}`);
  for (const a of finalAlerts) {
    console.log(`  [${a.severity.toUpperCase()}] ${a.message}`);
  }

  printSubHeader('9. 生成报告 (文本格式)');
  db = store.loadDB();
  const report = reportService.generateReport(db);
  const textReport = reportService.exportReport(db, 'text');
  console.log(textReport.content);

  printSubHeader('10. 导出 CSV 报告预览（前5行）');
  const csvReport = reportService.exportReport(db, 'csv');
  const csvLines = csvReport.content.split('\n');
  console.log(csvLines.slice(0, 6).join('\n'));

  printSubHeader('11. 审计日志摘要');
  db = store.loadDB();
  console.log(`审计日志总数: ${db.auditLogs.length}`);
  const recentLogs = db.auditLogs.slice(-10);
  for (const log of recentLogs) {
    console.log(`  [${log.timestamp}] ${log.entityType}.${log.action} -> ${log.entityId}`);
  }

  printHeader('测试完成');
}

run();