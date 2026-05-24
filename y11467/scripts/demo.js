const db = require('../src/db/database');
const retryQueueService = require('../src/services/retryQueueService');
const dirtyRecordService = require('../src/services/dirtyRecordService');
const dataConsistencyService = require('../src/services/dataConsistencyService');
const reportService = require('../src/services/reportService');
const { retryQueueDAO, dirtyRecordDAO } = require('../src/dao');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printStep(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`► ${title}`);
  console.log('='.repeat(60));
}

function printSubStep(title) {
  console.log(`\n  ○ ${title}`);
  console.log('  ' + '-'.repeat(50));
}

async function runDemo() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           服装打版样衣重试补偿队列 - 完整演示流程              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  try {
    const dbPath = path.join(process.cwd(), 'data', 'garment_sample.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('✓ 清理旧数据库');
    }

    printStep('步骤1: 初始化数据库');
    await db.init();
    await db.createTables();
    console.log('✓ 数据库初始化完成');
    await sleep(500);

    printStep('步骤2: 导入样例数据（包含正常数据和坏数据）');
    const { execSync } = require('child_process');
    execSync('node scripts/import-sample.js', { stdio: 'inherit' });
    await sleep(500);

    printStep('步骤3: 查看待处理的脏记录');
    const pendingDirty = await dirtyRecordService.getPendingDirtyRecords();
    console.log(`发现 ${pendingDirty.length} 条待处理脏记录:`);
    for (const dirty of pendingDirty) {
      console.log(`  - ID: ${dirty.id}`);
      console.log(`    类型: ${dirty.record_type}`);
      console.log(`    错误: ${dirty.error_type}`);
      console.log(`    建议: ${dirty.correction_suggestion}`);
    }
    await sleep(1000);

    printStep('步骤4: 执行自动修正（处理可自动修复的记录）');
    const allQueues = await retryQueueDAO.findAll();
    let totalAutoCorrected = 0;
    for (const queue of allQueues) {
      const corrected = await dirtyRecordService.autoCorrect(queue.id);
      totalAutoCorrected += corrected.length;
      if (corrected.length > 0) {
        console.log(`  队列 ${queue.style_code}: 自动修正 ${corrected.length} 条`);
      }
    }
    console.log(`✓ 共自动修正 ${totalAutoCorrected} 条记录`);
    await sleep(500);

    printStep('步骤5: 首次运行队列处理（验证有脏记录时不会成功）');
    let processResults = await retryQueueService.processQueue(10);
    console.log(`处理结果:`);
    for (const result of processResults) {
      if (result.success) {
        console.log(`  ✓ ${result.queueId}: 成功`);
      } else {
        console.log(`  ✗ ${result.queueId}: ${result.error}`);
      }
    }
    await sleep(500);

    printStep('步骤6: 查看队列状态（有pending脏记录的队列应进入manual）');
    const queuesAfterFirstProcess = await retryQueueDAO.findAll();
    for (const q of queuesAfterFirstProcess) {
      console.log(`  ${q.style_code}: ${q.status}`);
    }
    await sleep(500);

    printStep('步骤7: 人工修正所有剩余脏记录');
    const remainingDirty = await dirtyRecordService.getPendingDirtyRecords();
    console.log(`剩余 ${remainingDirty.length} 条需要人工处理:`);
    
    for (const dirty of remainingDirty) {
      console.log(`\n  处理脏记录: ${dirty.id}`);
      console.log(`  类型: ${dirty.record_type}, 错误: ${dirty.error_type}`);
      
      let correctedData;
      if (dirty.error_type === 'quantity_conflict') {
        correctedData = { quantity: 5 };
        console.log(`  人工修正: 将数量从 ${dirty.original_data.quantity} 改为 5`);
      } else if (dirty.error_type === 'missing_field') {
        correctedData = { 
          transfer_date: moment().format('YYYY-MM-DD'),
          to_dept: '打版车间',
          modify_date: moment().format('YYYY-MM-DD'),
          operation_date: moment().format('YYYY-MM-DD'),
          part: '肩宽'
        };
        console.log(`  人工修正: 补充缺失字段`);
      } else if (dirty.error_type === 'name_change') {
        correctedData = { style_code: dirty.original_data.style_code };
        console.log(`  人工修正: 确认款号 ${dirty.original_data.style_code} 无误`);
      }
      
      if (correctedData) {
        await dirtyRecordService.correctDirtyRecord(dirty.id, correctedData, 'demo-operator');
        console.log(`  ✓ 修正完成`);
      }
    }
    await sleep(500);

    printStep('步骤8: 脏记录全部修正后，再次运行队列处理');
    processResults = await retryQueueService.processQueue(10);
    console.log(`处理结果:`);
    for (const result of processResults) {
      if (result.success) {
        console.log(`  ✓ ${result.queueId}: 成功 (${result.classification})`);
      } else {
        console.log(`  ✗ ${result.queueId}: 失败 - ${result.error}`);
      }
    }
    await sleep(500);

    printStep('步骤9: 验证数据一致性');
    const finalQueues = await retryQueueDAO.findAll();
    const successQueue = finalQueues.find(q => q.status === 'success');
    if (successQueue) {
      const consistency = await dataConsistencyService.verifyConsistency(successQueue.id);
      console.log(`队列 ${successQueue.style_code} 一致性检查:`);
      console.log(`  状态: ${consistency.consistent ? '一致 ✓' : '不一致 ✗'}`);
      if (consistency.issues.length > 0) {
        console.log(`  问题:`, consistency.issues);
      }
    }
    await sleep(500);

    printStep('步骤10: 查看统一事实源（导出数据准备）');
    if (successQueue) {
      const unified = await dataConsistencyService.getUnifiedFactSource(successQueue.id);
      console.log(`款号: ${unified.styleCode}`);
      console.log(`热线单号: ${unified.hotlineOrderId}`);
      console.log(`数据版本: ${unified.dataVersion}`);
      console.log(`面料库存:`);
      for (const fabric of unified.unifiedData.fabricBalance) {
        console.log(`  - ${fabric.fabricName}(${fabric.color}): ${fabric.balance} ${fabric.unit}`);
      }
    }
    await sleep(500);

    printStep('步骤11: 生成品牌企划报告');
    const report = await reportService.generateBrandPlanningReport();
    const reportPath = await reportService.exportReportToFile(report, 'txt');
    const jsonReportPath = await reportService.exportReportToFile(report, 'json');
    
    console.log('报告概览:');
    console.log(`  总队列数: ${report.summary.totalQueues}`);
    console.log(`  成功率: ${report.summary.successRate}`);
    console.log(`  脏记录数: ${report.summary.dirtyRecords}`);
    console.log(`  死信数: ${report.summary.deadLetters}`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n  优化建议:`);
      for (const rec of report.recommendations) {
        console.log(`    [${rec.priority}] ${rec.content}`);
      }
    }
    
    console.log(`\n✓ 报告已生成:`);
    console.log(`  - TXT格式: ${reportPath}`);
    console.log(`  - JSON格式: ${jsonReportPath}`);
    await sleep(500);

    printStep('步骤12: 查看最终统计');
    const stats = await retryQueueService.getStatistics();
    console.log('队列状态统计:');
    for (const [status, count] of Object.entries(stats.byStatus)) {
      console.log(`  ${status}: ${count}`);
    }

    console.log('\n' + '╔══════════════════════════════════════════════════════════════╗');
    console.log('║                        演示流程完成!                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n可用命令:');
    console.log('  npm start       - 启动API服务器');
    console.log('  npm run report  - 生成最新报告');
    console.log('\nAPI地址: http://localhost:3000');

  } catch (error) {
    console.error('\n✗ 演示失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    db.close();
  }
}

runDemo();
