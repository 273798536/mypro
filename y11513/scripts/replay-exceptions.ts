import '../src/models/database';
import { reconciliationService } from '../src/services/reconciliation.service';
import { logger } from '../src/utils/logger';

async function main(): Promise<void> {
  console.log('\n🔄 开始回放异常任务...\n');

  try {
    const result = await reconciliationService.replayExceptions();

    console.log(`
回放结果:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总回放任务数: ${result.totalReplayed}
  成功: ${result.successCount}
  失败: ${result.failedCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    if (result.results.length > 0) {
      console.log('详细结果:');
      result.results.forEach((r, i) => {
        const status = r.success ? '✅' : '❌';
        console.log(`  ${status} [${r.taskId}] ${r.recordType} - ${r.previousStatus} → ${r.newStatus}`);
        if (!r.success && r.previousStatus !== r.newStatus) {
          console.log(`     原因: 状态未变更`);
        }
      });
    }

    console.log('\n✅ 异常回放完成！');

  } catch (error) {
    logger.error('回放异常任务失败', error as Error);
    console.error('\n❌ 回放失败:', (error as Error).message);
    process.exit(1);
  }
}

main();
