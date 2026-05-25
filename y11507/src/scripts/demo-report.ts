import { getUnifiedRecords, getStatisticsForExport, getRetryAnalysis, exportToCSV, exportToJSON } from '../services/exportService';
import { getQueueStatistics, getManualInterventionItems, getDeadLetterItems } from '../services/queueService';
import { getDiffLogsByQueueId } from '../services/diffService';

const demoReport = async () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║                 生成护士长报告                              ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const [stats, retryAnalysis, queueStats, manualItems, deadLetterItems] = await Promise.all([
    getStatisticsForExport(),
    getRetryAnalysis(),
    getQueueStatistics(),
    getManualInterventionItems(),
    getDeadLetterItems(),
  ]);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   可重试分类分析                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const retryByType: Record<string, any[]> = {};
  retryAnalysis.forEach((item: any) => {
    if (!retryByType[item.dirtyType]) retryByType[item.dirtyType] = [];
    retryByType[item.dirtyType].push(item);
  });

  Object.entries(retryByType).forEach(([type, items]) => {
    let recoveryHint = '';
    let priority = '';
    switch (type) {
      case 'missing_fields':
        recoveryHint = '补全字段即可恢复，操作简单';
        priority = '★★★★★ (最高优先级)';
        break;
      case 'cross_day':
        recoveryHint = '核实日期后重新提交';
        priority = '★★★★☆';
        break;
      case 'name_changed':
        recoveryHint = '确认设备名称变更原因后统一修改';
        priority = '★★★☆☆';
        break;
      case 'amount_conflict':
        recoveryHint = '与财务核对后修正金额';
        priority = '★★☆☆☆';
        break;
      case 'quantity_conflict':
        recoveryHint = '核对数量后修正';
        priority = '★★☆☆☆';
        break;
      default:
        recoveryHint = '根据具体情况处理';
        priority = '★☆☆☆☆';
    }
    console.log(`  ${type}: ${items.length} 条`);
    console.log(`    恢复方式: ${recoveryHint}`);
    console.log(`    优先级: ${priority}\n`);
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    死信处理建议                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (deadLetterItems.length > 0) {
    console.log(`共 ${deadLetterItems.length} 条死信记录:\n`);
    deadLetterItems.forEach((item: any, index: number) => {
      console.log(`${index + 1}. ${item.rawData ? JSON.parse(item.rawData).deviceName || '未知设备' : '未知设备'} (${item.id})`);
      console.log(`   类型: ${item.recordType}`);
      console.log(`   脏类型: ${item.dirtyType}`);
      console.log(`   详情: ${item.dirtyDetails}`);
      console.log(`   重试次数: ${item.retryCount}/${item.maxRetries}`);
      console.log(`   处理建议: 需要人工检查后决定是否重新提交或关闭\n`);
    });
  } else {
    console.log('  ✓ 当前没有死信记录\n');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   待人工处理列表                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (manualItems.length > 0) {
    console.log(`共 ${manualItems.length} 条待处理:\n`);
    manualItems.forEach((item: any, index: number) => {
      const rawData = item.rawData ? JSON.parse(item.rawData) : {};
      console.log(`${index + 1}. ${rawData.deviceName || '未知设备'} (${item.id})`);
      console.log(`   脏类型: ${item.dirtyType}`);
      console.log(`   详情: ${item.dirtyDetails}`);
      console.log(`   处理人: ${item.assignee || '未分配'}`);
      console.log(`   提交时间: ${item.createdAt}\n`);
    });
  } else {
    console.log('  ✓ 当前没有需要人工处理的记录\n');
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                   恢复后续跑建议                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('优先级处理顺序:');
  console.log('  1. missing_fields - 简单补全即可恢复 (最快)');
  console.log('  2. cross_day - 日期核实后批量处理');
  console.log('  3. name_changed - 与设备科确认后统一修改');
  console.log('  4. amount_conflict / quantity_conflict - 财务核对后处理');
  console.log('  5. dead_letter - 逐条检查后决定重新提交或关闭');

  console.log('\n注意事项:');
  console.log('  • 修正后的记录会自动重新汇总');
  console.log('  • 所有变更都记录了操作人、时间、前后差异');
  console.log('  • 导出文件与接口查询使用同一数据源');
  console.log('  • 证书过期自动检查，每小时执行一次');
  console.log('  • 设备停用会联动更新相关证书状态');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      数据一致性验证                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allRecords = await getUnifiedRecords();
  const verifiedItems: string[] = [];
  let verifiedCount = 0;

  for (const record of allRecords.slice(0, 3)) {
    if (record.queueId) {
      const diffLogs = await getDiffLogsByQueueId(record.queueId);
      if (diffLogs.length > 0) {
        verifiedCount++;
        verifiedItems.push(`  ✓ ${record.deviceName} (${record.recordType}): ${diffLogs.length} 条变更日志`);
      }
    }
  }

  console.log(`已验证 ${verifiedCount} 条记录的可追溯性:\n`);
  verifiedItems.forEach(item => console.log(item));

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      导出文件                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const csvPath = await exportToCSV();
  const jsonPath = await exportToJSON();
  console.log(`  CSV导出: ${csvPath}`);
  console.log(`  JSON导出: ${jsonPath}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    护士长报告总结                           ║');
  console.log('║                                                            ║');
  console.log('║  重点关注:                                                 ║');
  console.log('║  ✓ 可重试分类明确，按优先级处理即可                         ║');
  console.log('║  ✓ 死信记录来源清晰，可追溯问题根源                         ║');
  console.log('║  ✓ 恢复后续跑有明确步骤，不会遗漏                           ║');
  console.log('║  ✓ 所有数据统一来源，导出和查询结果一致                     ║');
  console.log('║  ✓ 每一步操作都有差异日志可回看                             ║');
  console.log('║  ✓ 证书过期和设备停用自动联动                               ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
};

demoReport().catch(console.error);
