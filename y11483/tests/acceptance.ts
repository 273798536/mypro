import 'reflect-metadata';
import chalk from 'chalk';
import { runNormalFlow } from './normal-flow';
import { runEdgeCases } from './edge-cases';

async function runAllTests() {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║                                                                   ║'));
  console.log(chalk.cyan('║           中央厨房留样验收回放链路服务 - 完整验收测试                ║'));
  console.log(chalk.cyan('║                                                                   ║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));

  const results: { name: string; success: boolean; error?: string; traceNo?: string }[] = [];

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
  console.log(chalk.magenta('  第三阶段: 重启验证提示'));
  console.log(chalk.magenta('═══════════════════════════════════════════════════════════════════'));

  console.log(chalk.yellow('\n  【重要提示】重启验证步骤:'));
  console.log(chalk.gray('  ───────────────────────────────────────────────'));
  console.log(chalk.cyan('  1. 启动服务:'));
  console.log(chalk.white('     npm run dev'));
  console.log(chalk.cyan('  2. 查询历史记录（验证数据持久化）:'));
  console.log(chalk.white('     curl -X GET http://localhost:3000/api/trace/'));
  console.log(chalk.cyan('  3. 查看具体链路:'));
  console.log(chalk.white(`     curl -X GET http://localhost:3000/api/trace/<traceNo>/history'));
  console.log(chalk.cyan('  4. 查看API请求日志:'));
  console.log(chalk.white('     查看 data/kitchen_trace.db 中的 api_request_logs 表'));
  console.log(chalk.gray('  ───────────────────────────────────────────────\n'));

  console.log(chalk.blue('\n═══════════════════════════════════════════════════════════════════'));
  console.log(chalk.blue('  测试结果汇总'));
  console.log(chalk.blue('═══════════════════════════════════════════════════════════════════\n'));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    const status = result.success ? chalk.green('✓ 通过') : chalk.red('✗ 失败');
    console.log(`  ${status} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`     错误: ${result.error}`);
    }
    if (result.traceNo) {
      console.log(`     链路编号: ${result.traceNo}`);
    }
  });

  console.log(chalk.gray('\n  ─────────────────────────────────────────────────────────────'));
  console.log(`  总计: ${results.length} 项测试`);
  console.log(`  通过: ${passed} 项`);
  console.log(`  失败: ${failed} 项`);

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