const chalk = require('./_colors');

function printSummary(result) {
  console.log(chalk.cyan('\n---------- 终端摘要 ----------\n'));

  console.log(chalk.bold('材料统计:'));
  console.log(`  正常记录: ${result.materialCount.normal} 条`);
  console.log(`  带缺口记录: ${result.materialCount.gap} 条`);
  console.log(`  维修备注: ${result.materialCount.repair} 条`);
  console.log(`  后补说明: ${result.materialCount.supplementary} 条`);
  console.log('');

  console.log(chalk.bold('回放结果:'));
  console.log(`  已回放参数记录: ${result.playedBack} 条`);
  console.log(`  参数全部可追溯: ${result.allTraceable ? chalk.green('是') : chalk.red('否')}`);
  console.log('');

  if (result.gaps.length > 0) {
    console.log(chalk.yellow(chalk.bold('采样缺口 (已挂起):')));
    for (const g of result.gaps) {
      console.log(chalk.yellow(`  ⏸ ${g.recordId} (${g.venue})`));
      console.log(chalk.yellow(`     缺失 ${g.missingBands.length} 个频段: ${g.missingBands.join(', ')}`));
      if (g.remark) {
        console.log(chalk.yellow(`     备注: ${g.remark}`));
      }
    }
    console.log('');
  }

  if (result.anomalies.length > 0) {
    console.log(chalk.red(chalk.bold('异常项:')));
    for (const a of result.anomalies) {
      console.log(chalk.red(`  ✗ ${a.recordId}: ${a.description}`));
    }
    console.log('');
  }

  console.log(chalk.bold('输出文件:'));
  console.log(`  回放报告 (含参数追溯线索): ${result.reportFile}`);
  console.log(chalk.yellow(`  异常队列 (JSON): ${result.anomalyQueueFile}`));
  console.log(chalk.yellow(`  异常队列 (阅读版): ${result.anomalyReadableFile}`));
  console.log(`  终端摘要存档: ${result.summaryFile}`);

  console.log(chalk.cyan('\n-------------------------------'));
}

module.exports = { printSummary };
