const db = require('../src/db/database');
const reportService = require('../src/services/reportService');

async function generateReport() {
  console.log('='.repeat(50));
  console.log('生成品牌企划报告');
  console.log('='.repeat(50));

  try {
    await db.init();
    console.log('✓ 数据库连接成功');

    const report = await reportService.generateBrandPlanningReport();
    console.log('✓ 报告生成完成');

    const txtPath = await reportService.exportReportToFile(report, 'txt');
    const jsonPath = await reportService.exportReportToFile(report, 'json');

    console.log('\n' + '='.repeat(50));
    console.log('报告概览:');
    console.log('='.repeat(50));
    console.log(`总队列数: ${report.summary.totalQueues}`);
    console.log(`成功率: ${report.summary.successRate}`);
    console.log(`待重试: ${report.summary.pendingRetry}`);
    console.log(`人工处理: ${report.summary.manualIntervention}`);
    console.log(`脏记录: ${report.summary.dirtyRecords}`);
    console.log(`死信: ${report.summary.deadLetters}`);

    if (report.recommendations.length > 0) {
      console.log('\n优化建议:');
      for (const rec of report.recommendations) {
        console.log(`  [${rec.priority}] ${rec.type}: ${rec.content}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('报告文件已生成:');
    console.log(`  TXT:  ${txtPath}`);
    console.log(`  JSON: ${jsonPath}`);
  } catch (error) {
    console.error('✗ 生成失败:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

generateReport();
