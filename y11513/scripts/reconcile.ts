import '../src/models/database';
import { reconciliationService } from '../src/services/reconciliation.service';
import { logger } from '../src/utils/logger';

async function main(): Promise<void> {
  console.log('\n🔍 开始执行对账...\n');

  try {
    const result = await reconciliationService.performReconciliation();

    console.log(`
对账结果汇总:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总记录数: ${result.totalRecords}
  一致记录: ${result.consistentRecords}
  不一致记录: ${result.inconsistentRecords}
  重复记录: ${result.duplicateRecords}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    console.log('任务状态分布:');
    Object.entries(result.taskStatusSummary).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n处理原因分布:');
    Object.entries(result.processingReasonSummary).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count}`);
    });

    if (result.inconsistencies.length > 0) {
      console.log(`\n⚠️  发现 ${result.inconsistencies.length} 条不一致记录:`);
      result.inconsistencies.slice(0, 10).forEach((item, i) => {
        console.log(`
  ${i + 1}. [${item.recordType}] ${item.recordId}
     问题: ${item.issue}
     详情: ${JSON.stringify(item.details)}`);
      });

      if (result.inconsistencies.length > 10) {
        console.log(`  ... 还有 ${result.inconsistencies.length - 10} 条记录`);
      }
    }

    console.log('\n✅ 对账完成！');

  } catch (error) {
    logger.error('对账失败', error as Error);
    console.error('\n❌ 对账失败:', (error as Error).message);
    process.exit(1);
  }
}

main();
