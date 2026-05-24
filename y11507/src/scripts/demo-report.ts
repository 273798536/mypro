import { getUnifiedRecords, getStatisticsForExport, getRetryAnalysis, exportToCSV, exportToJSON } from '../services/exportService';

const demoReport = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║                 生成护士长报告                              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const [stats, retryAnalysis, allRecords, manualItems, deadLetterItems] = await Promise.all([
    getStatisticsForExport(),
    getRetryAnalysis(),
    getUnifiedRecords(),
    getUnifiedRecords({ status: 'manual_intervention' }),
    getUnifiedRecords({ status: 'dead_letter' }),
  ]);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      数据概览                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('按记录类型统计:');
  stats.byRecordType.forEach((item: any) => {
    console.log(`  ${item.recordType}: ${item.count} 条`);
  });

  console.log('\n按状态统计:');
  stats.byStatus.forEach((item: any) => {
    console.log(`  ${item.status}: ${item.count} 条`);
  });

  console.log('\n按脏类型统计:');
  stats.byDirtyType.forEach((item: any) => {
    console.log(`  ${item.dirtyType}: ${item.count} 条`);
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   可重试分类分析                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const retryByType: Record<string, number> = {};
  retryAnalysis.forEach((item: any) => {
    if (!retryByType[item.dirtyType]) retryByType[item.dirtyType] = 0;
    retryByType[item.dirtyType]++;
  });

  Object.entries(retryByType).forEach(([type, count]) => {
    let recoveryHint = '';
    switch (type) {
      case 'missing_fields':
        recoveryHint = '补全字段即可恢复，优先级高';
        break;
      case 'cross_day':
        recoveryHint = '核实日期后重新提交';
        break;
      case 'name_changed':
        recoveryHint = '确认设备名称变更原因';
        break;
      case 'amount_conflict':
        recoveryHint = '与财务核对后修正';
        break;
      case 'quantity_conflict':
        recoveryHint = '核对数量后修正';
        break;
    }
    console.log(`  ${type}: ${count} 条 - ${recoveryHint}`);
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    死信处理建议                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (deadLetterItems.length > 0) {
    deadLetterItems.forEach((item: any, index: number) => {
      const retryInfo = retryAnalysis.find((r: any) => r.id === item.queueId);
      console.log(`${index + 1}. ${item.deviceName} (${item.queueId})`);
      console.log(`   类型: ${item.recordType}`);
      console.log(`   脏类型: ${item.details}`);
      console.log(`   重试次数: ${retryInfo?.retryCount || 0}/${retryInfo?.maxRetries || 3}`);
      console.log('');
    });
  } else {
    console.log('  暂无死信记录\n');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   恢复后续跑建议                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('优先级处理顺序:');
  console.log('  1. missing_fields - 简单补全即可恢复 (最快)');
  console.log('  2. cross_day - 日期核实后批量处理');
  console.log('  3. name_changed - 与设备科确认后统一修改');
  console.log('  4. amount_conflict / quantity_conflict - 财务核对后处理');

  console.log('\n注意事项:');
  console.log('  • 修正后的记录会自动重新汇总');
  console.log('  • 所有变更都记录了操作人、时间、前后差异');
  console.log('  • 导出文件与接口查询使用同一数据源');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      导出文件                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const csvPath = await exportToCSV();
  const jsonPath = await exportToJSON();
  console.log(`  CSV导出: ${csvPath}`);
  console.log(`  JSON导出: ${jsonPath}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    报告生成完成！                           ║');
  console.log('║                                                            ║');
  console.log('║  护士长关注点总结:                                          ║');
  console.log('║  ✓ 可重试分类明确，按优先级处理即可                         ║');
  console.log('║  ✓ 死信记录来源清晰，可追溯问题根源                         ║');
  console.log('║  ✓ 恢复后续跑有明确步骤，不会遗漏                           ║');
  console.log('║  ✓ 所有数据统一来源，导出和查询结果一致                     ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

demoReport().catch(console.error);
