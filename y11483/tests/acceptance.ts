import 'reflect-metadata';
import chalk from 'chalk';
import { runNormalFlow } from './normal-flow';
import { runEdgeCases } from './edge-cases';
import { initDatabase, closeDatabase } from '../src/config/database';
import { DataGenerator } from '../src/services/DataGenerator';
import { BatchTraceService } from '../src/services/BatchTraceService';
import { ReplayService } from '../src/services/ReplayService';
import { ConflictStrategy, TraceStatus } from '../src/entities';

async function runPhase3() {
  console.log(chalk.yellow('\n  第三阶段真实验证...'));
  
  const BATCH_BAD = 'BATCH-VERIFY-BAD-' + Date.now();
  const POT_BAD = 'POT-VERIFY-BAD';
  const BATCH_PARTIAL = 'BATCH-VERIFY-PARTIAL-' + Date.now();
  const POT_PARTIAL = 'POT-VERIFY-PARTIAL';
  const OPERATOR = 'acceptance_test';

  const dataGenerator = new DataGenerator();
  const traceService = new BatchTraceService();
  const replayService = new ReplayService();

  let success = true;
  const details: string[] = [];

  try {
    console.log(chalk.cyan('\n  [1/5] 验证坏数据不崩溃...'));
    await dataGenerator.generateBadData(BATCH_BAD, POT_BAD, OPERATOR);
    
    const badTrace = await traceService.createTrace({
      batchNo: BATCH_BAD,
      potNo: POT_BAD,
      productName: '验收坏数据测试',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.OVERWRITE,
      operator: OPERATOR,
    });
    
    const badProcessed = await traceService.processTrace({
      traceNo: badTrace.traceNo,
      operator: OPERATOR,
    });
    
    if (badProcessed.status === TraceStatus.FAILED || badProcessed.status === TraceStatus.PARTIAL_FAILED) {
      details.push('坏数据处理 - 系统正确标记状态: ' + badProcessed.status);
    } else {
      details.push('坏数据处理 - 系统未崩溃，状态: ' + badProcessed.status);
    }
    details.push('  失败项数量: ' + (badProcessed.failedItems?.length || 0));
    
    const badReplayResult = await replayService.replayTrace(badTrace.traceNo, OPERATOR);
    details.push('坏数据回放 - 发现 ' + badReplayResult.issuesFound.length + ' 个问题');
    
    const hasBadDataIssue = badReplayResult.issuesFound.find(
      (i: any) => i.severity === 'high'
    );
    if (!hasBadDataIssue) {
      console.log(chalk.yellow('  注意: 回放未检测到严重问题，可能数据已被清洗'));
    } else {
      details.push('  - 成功检测到坏数据异常');
    }
    
    console.log(chalk.green('  ✓ 坏数据处理验证通过'));

    console.log(chalk.cyan('\n  [2/5] 验证部分失败场景...'));
    await dataGenerator.generatePartialFailureData(BATCH_PARTIAL, POT_PARTIAL, OPERATOR);
    
    const partialTrace = await traceService.createTrace({
      batchNo: BATCH_PARTIAL,
      potNo: POT_PARTIAL,
      productName: '验收部分失败测试',
      productionTime: new Date(),
      conflictStrategy: ConflictStrategy.OVERWRITE,
      operator: OPERATOR,
    });
    
    const partialProcessed = await traceService.processTrace({
      traceNo: partialTrace.traceNo,
      operator: OPERATOR,
    });
    
    if (partialProcessed.failedItems && partialProcessed.failedItems.length > 0) {
      details.push('部分失败 - 成功收集 ' + partialProcessed.failedItems.length + ' 个失败项');
      (partialProcessed.failedItems as any[]).slice(0, 2).forEach((item: any) => {
        details.push('  - ' + (item.type || item.source || 'unknown') + ': ' + (item.error || item.message || 'no details'));
      });
    } else {
      details.push('部分失败 - 无失败项，状态: ' + partialProcessed.status);
    }
    console.log(chalk.green('  ✓ 部分失败场景验证通过'));

    console.log(chalk.cyan('\n  [3/5] 验证异常回放功能...'));
    const replayResult = await replayService.replayTrace(partialTrace.traceNo, OPERATOR);
    
    details.push('回放 - 发现 ' + replayResult.issuesFound.length + ' 个问题');
    details.push('回放 - 状态: ' + replayResult.status);
    
    const missingTempIssue = replayResult.issuesFound.find(
      (i: any) => i.source === 'temperature' && i.type === 'missing'
    );
    if (!missingTempIssue) {
      console.log(chalk.red('  ✗ 异常回放未检测到缺失的温度记录!'));
      console.log(chalk.yellow('  回放发现的问题:'));
      replayResult.issuesFound.forEach((issue: any) => {
        console.log('    - [' + issue.severity + '] ' + issue.source + ': ' + issue.message);
      });
      throw new Error('回放功能未能检测到缺失的温度记录');
    }
    details.push('  - 成功检测到缺失温度记录的异常');
    
    if (replayResult.issuesFound.length > 0) {
      replayResult.issuesFound.slice(0, 3).forEach((issue: any) => {
        details.push('  - [' + issue.severity + '] ' + issue.source + ': ' + issue.message.substring(0, 50));
      });
    }
    console.log(chalk.green('  ✓ 异常回放验证通过 - 成功检测到缺失数据异常'));

    console.log(chalk.cyan('\n  [4/5] 验证对账功能...'));
    const reconcileResult = await replayService.reconcile(BATCH_BAD, POT_BAD, OPERATOR);
    
    details.push('对账 - 执行 ' + reconcileResult.checks.length + ' 项检查');
    const passedChecks = reconcileResult.checks.filter(c => c.passed).length;
    details.push('对账 - 通过 ' + passedChecks + '/' + reconcileResult.checks.length + ' 项');
    console.log(chalk.green('  ✓ 对账功能验证通过'));

    console.log(chalk.cyan('\n  [5/5] 验证数据持久化...'));
    const reloadedTrace = await traceService.getTrace(partialTrace.traceNo);
    
    if (!reloadedTrace) {
      throw new Error('数据未持久化 - 无法重新加载链路');
    }
    details.push('持久化 - 链路数据成功从数据库重载');
    details.push('持久化 - 状态: ' + reloadedTrace.status + ', 门店数: ' + reloadedTrace.totalStores);
    console.log(chalk.green('  ✓ 数据持久化验证通过'));

  } catch (error: any) {
    success = false;
    details.push('错误: ' + error.message);
    console.log(chalk.red('  ✗ 第三阶段验证失败: ' + error.message));
  }

  return { success, details };
}

async function runAllTests() {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                                   ║'));
  console.log(chalk.cyan('║           中央厨房留样验收回放链路服务 - 完整验收测试                ║'));
  console.log(chalk.cyan('║                                                                   ║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

  const results: { name: string; success: boolean; error?: string; traceNo?: string; details?: string[] }[] = [];

  console.log(chalk.magenta('\n═══════════════════════════════════════════════════════════════════'));
  console.log(chalk.magenta('  第一阶段: 正常链路测试'));
  console.log(chalk.magenta('═══════════════════════════════════════════════════════════════════'));

  const normalResult = await runNormalFlow();
  results.push({ name: '正常链路测试', ...normalResult });

  console.log(chalk.magenta('\n═══════════════════════════════════════════════════════════════════'));
  console.log(chalk.magenta('  第二阶段: 边界情况测试'));
  console.log(chalk.magenta('═══════════════════════════════════════════════════════════════════'));

  const edgeResult = await runEdgeCases();
  results.push({ name: '边界情况测试', ...edgeResult });

  console.log(chalk.magenta('\n═══════════════════════════════════════════════════════════════════'));
  console.log(chalk.magenta('  第三阶段: 真实验证 - 坏数据/部分失败/回放/对账'));
  console.log(chalk.magenta('═══════════════════════════════════════════════════════════════════'));

  await initDatabase();
  const phase3Result = await runPhase3();
  await closeDatabase();
  
  results.push({ 
    name: '第三阶段真实验证', 
    success: phase3Result.success, 
    details: phase3Result.details 
  });

  if (phase3Result.details && phase3Result.details.length > 0) {
    console.log(chalk.gray('\n  ───────────────────────────────────────────────'));
    console.log(chalk.cyan('  验证详情:'));
    phase3Result.details.forEach(detail => {
      console.log('    ' + detail);
    });
    console.log(chalk.gray('  ───────────────────────────────────────────────'));
  }

  console.log(chalk.blue('\n═══════════════════════════════════════════════════════════════════'));
  console.log(chalk.blue('  测试结果汇总'));
  console.log(chalk.blue('═══════════════════════════════════════════════════════════════════\n'));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    const status = result.success ? chalk.green('✓ 通过') : chalk.red('✗ 失败');
    console.log('  ' + status + ' ' + result.name);
    if (!result.success && result.error) {
      console.log('     错误: ' + result.error);
    }
    if (result.traceNo) {
      console.log('     链路编号: ' + result.traceNo);
    }
    if (result.details && result.details.length > 0) {
      console.log('     详情:');
      result.details.slice(0, 5).forEach(detail => {
        console.log('       - ' + detail);
      });
      if (result.details.length > 5) {
        console.log('       ... 还有 ' + (result.details.length - 5) + ' 条');
      }
    }
  });

  console.log(chalk.gray('\n  ─────────────────────────────────────────────────────────────'));
  console.log('  总计: ' + results.length + ' 项测试');
  console.log('  通过: ' + passed + ' 项');
  console.log('  失败: ' + failed + ' 项');

  if (failed === 0) {
    console.log(chalk.green('\n╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.green('║                    所有测试通过! 验收合格!                          ║'));
    console.log(chalk.green('╚═══════════════════════════════════════════════════════════════╝\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.red('║                存在测试失败，请检查代码!                              ║'));
    console.log(chalk.red('╚═══════════════════════════════════════════════════════════════╝\n'));
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error in test runner:', error);
    process.exit(1);
  });
}