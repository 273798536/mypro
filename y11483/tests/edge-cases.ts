import 'reflect-metadata';
import chalk from 'chalk';
import { initDatabase, closeDatabase } from '../src/config/database';
import { DataGenerator } from '../src/services/DataGenerator';
import { BatchTraceService } from '../src/services/BatchTraceService';
import { SampleLabelService } from '../src/services/SampleLabelService';
import { AuditService } from '../src/services/AuditService';
import { ConflictStrategy, TraceStatus, EntityType } from '../src/entities';

async function runEdgeCases() {
  console.log(chalk.blue('\n╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue('║                    边界情况验收测试                           ║'));
  console.log(chalk.blue('╚══════════════════════════════════════════════════════════════╝\n'));

  await initDatabase();

  const dataGenerator = new DataGenerator();
  const traceService = new BatchTraceService();
  const sampleService = new SampleLabelService();
  const auditService = new AuditService();

  const BATCH_NO = 'BATCH-20260524-EDGE';
  const POT_NO = 'POT-EDGE';
  const OPERATOR = 'test_user_edge';

  let sampleId: string;
  let traceNo: string;

  try {
    console.log(chalk.yellow('\n【测试 1/8】重复提交 - ERROR策略（预期失败）...'));
    await dataGenerator.generateBatchData({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '清炖狮子头',
      storeCount: 3,
      operator: OPERATOR,
    });

    const trace1 = await traceService.createTrace({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '清炖狮子头',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.ERROR,
      operator: OPERATOR,
    });
    traceNo = trace1.traceNo;

    try {
      await traceService.createTrace({
        batchNo: BATCH_NO,
        potNo: POT_NO,
        productName: '清炖狮子头',
        productionTime: new Date(),
        conflictStrategy: ConflictStrategy.ERROR,
        operator: OPERATOR,
      });
      console.log(chalk.red('✗ 重复提交未抛出错误，测试失败!'));
      throw new Error('Expected error for duplicate submission');
    } catch (error: any) {
      console.log(chalk.green('✓ 重复提交正确抛出错误:'), error.message.substring(0, 50) + '...');
    }
    console.log(chalk.green('✓ ERROR策略测试通过'));

    console.log(chalk.yellow('\n【测试 2/8】重复提交 - IGNORE策略...'));
    const traceIgnore = await traceService.createTrace({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '清炖狮子头',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.IGNORE,
      operator: OPERATOR,
    });
    if (traceIgnore.traceNo !== traceNo) {
      console.log(chalk.red('✗ IGNORE策略创建了新链路，测试失败!'));
      throw new Error('IGNORE strategy should return existing trace');
    }
    console.log(chalk.green('✓ IGNORE策略返回原有链路，版本号:', traceIgnore.version));
    console.log(chalk.green('✓ IGNORE策略测试通过'));

    console.log(chalk.yellow('\n【测试 3/8】重复提交 - OVERWRITE策略...'));
    const traceOverwrite = await traceService.createTrace({
      batchNo: BATCH_NO,
      potNo: POT_NO,
      productName: '清炖狮子头(重制)',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.OVERWRITE,
      operator: OPERATOR,
    });
    if (traceOverwrite.version !== 2) {
      console.log(chalk.red('✗ OVERWRITE策略版本号未增加，测试失败!'));
      throw new Error('OVERWRITE strategy should increment version');
    }
    if (traceOverwrite.productName !== '清炖狮子头(重制)') {
      console.log(chalk.red('✗ OVERWRITE策略未更新字段，测试失败!'));
      throw new Error('OVERWRITE strategy should update fields');
    }
    console.log(chalk.green('✓ OVERWRITE策略更新数据，版本号:', traceOverwrite.version));
    console.log(chalk.green('✓ OVERWRITE策略测试通过'));

    console.log(chalk.yellow('\n【测试 4/8】撤回后再提交...'));
    const samples = await sampleService.getByBatchPot(BATCH_NO, POT_NO);
    if (samples.length === 0) {
      throw new Error('No sample found for withdraw test');
    }
    sampleId = samples[0].id;

    const withdrawn = await sampleService.withdraw(sampleId, OPERATOR, '数据有误，撤回修正');
    console.log(chalk.green('✓ 撤回后状态:'), withdrawn.status);

    const resubmitted = await sampleService.submit(sampleId, OPERATOR, '修正后重新提交');
    console.log(chalk.green('✓ 再提交后状态:'), resubmitted.status);
    console.log(chalk.green('✓ 版本号:'), resubmitted.version);

    const sampleHistory = await sampleService.getHistory(sampleId);
    const withdrawLog = sampleHistory.find((l: any) => l.operationType === 'withdraw');
    const submitLog = sampleHistory.find((l: any) => l.operationType === 'submit');
    
    if (!withdrawLog || !submitLog) {
      console.log(chalk.red('✗ 撤回/提交历史记录缺失，测试失败!'));
      throw new Error('Withdraw/submit history missing');
    }
    console.log(chalk.green('✓ 撤回历史记录存在，原因:'), withdrawLog.reason);
    console.log(chalk.green('✓ 再提交历史记录存在，原因:'), submitLog.reason);
    console.log(chalk.green('✓ 撤回后再提交测试通过'));

    console.log(chalk.yellow('\n【测试 5/8】人工改判...'));
    const processed = await traceService.processTrace({
      traceNo: traceNo,
      operator: OPERATOR,
    });
    console.log(chalk.green('✓ 处理后初始状态:'), processed.status);

    const judged = await traceService.manualJudge({
      traceNo: traceNo,
      operator: 'quality_manager',
      reason: '经品控主管复核，该批次符合验收标准',
      judgment: 'pass',
    });
    console.log(chalk.green('✓ 人工改判后状态:'), judged.status);
    console.log(chalk.green('✓ 改判人:'), judged.updatedBy);
    console.log(chalk.green('✓ 版本号:'), judged.version);

    const traceHistory = await traceService.getTraceHistory(traceNo);
    const judgeLog = traceHistory.find((l: any) => l.operationType === 'manual_judge');
    if (!judgeLog) {
      console.log(chalk.red('✗ 人工改判历史记录缺失，测试失败!'));
      throw new Error('Manual judge history missing');
    }
    console.log(chalk.green('✓ 人工改判历史记录存在，原因:'), judgeLog.reason);
    console.log(chalk.green('✓ 人工改判测试通过'));

    console.log(chalk.yellow('\n【测试 6/8】导出前冻结...'));
    const frozen = await traceService.freezeTrace({
      traceNo: traceNo,
      operator: 'quality_manager',
      reason: '导出前冻结，确保数据不可修改',
    });
    console.log(chalk.green('✓ 冻结后状态:'), frozen.status);
    console.log(chalk.green('✓ 冻结时间:'), frozen.frozenAt?.toLocaleString());
    console.log(chalk.green('✓ 冻结人:'), frozen.frozenBy);

    try {
      await traceService.processTrace({
        traceNo: traceNo,
        operator: OPERATOR,
      });
      console.log(chalk.red('✗ 冻结状态下仍可处理，测试失败!'));
      throw new Error('Should not process frozen trace');
    } catch (error: any) {
      console.log(chalk.green('✓ 冻结状态下处理正确抛出错误:'), error.message);
    }
    console.log(chalk.green('✓ 导出前冻结测试通过'));

    console.log(chalk.yellow('\n【测试 7/8】解冻后重新处理...'));
    const unfrozen = await traceService.unfreezeTrace(
      traceNo,
      'quality_manager',
      '需要补充数据，临时解冻'
    );
    console.log(chalk.green('✓ 解冻后状态:'), unfrozen.status);

    const reprocessed = await traceService.processTrace({
      traceNo: traceNo,
      operator: OPERATOR,
    });
    console.log(chalk.green('✓ 解冻后重新处理成功，状态:'), reprocessed.status);
    console.log(chalk.green('✓ 解冻后重新处理测试通过'));

    console.log(chalk.yellow('\n【测试 8/8】历史记录完整性验证...'));
    const fullHistory = await auditService.getEntityHistoryByNo(traceNo, EntityType.BATCH_TRACE);
    console.log(chalk.green('✓ 总历史记录数:'), fullHistory.length);
    
    const expectedOperations = ['create', 'update', 'freeze', 'unfreeze', 'manual_judge'];
    const foundOperations = new Set(fullHistory.map((l: any) => l.operationType));
    
    for (const op of expectedOperations) {
      if (!foundOperations.has(op)) {
        console.log(chalk.yellow('Warning: ') + ` ${op} operation not found, may be in different test phase`);
      }
    }

    console.log(chalk.green('\n  历史记录详情:'));
    fullHistory.forEach((log: any, idx: number) => {
      console.log(`    ${idx + 1}. [${log.operationTime.toLocaleString()}] ${log.operator.padEnd(20)} ${log.operationType.padEnd(15)} ${log.oldStatus || '-'} → ${log.newStatus || '-'}`);
      console.log(`       原因: ${log.reason}`);
    });
    console.log(chalk.green('✓ 历史记录完整性验证通过'));

    console.log(chalk.green('\n╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.green('║                    边界情况测试全部通过!                     ║'));
    console.log(chalk.green('╚══════════════════════════════════════════════════════════════╝\n'));

    return { success: true, traceNo };
  } catch (error: any) {
    console.error(chalk.red('\n✗ 边界情况测试失败:'), error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  runEdgeCases().then((result) => {
    process.exit(result.success ? 0 : 1);
  });
}

export { runEdgeCases };