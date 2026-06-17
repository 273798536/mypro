#!/usr/bin/env node

const path = require('path');
const { runPlayback } = require('./playback');
const { prepareMaterials } = require('./materials');
const { printSummary } = require('./summary');
const chalk = require('./_colors');

function printHelp() {
  const lines = [];
  lines.push('');
  lines.push('========== 声学混响参数回放工具 ==========');
  lines.push('');
  lines.push('用法:');
  lines.push('  node src/cli.js <command> [options]');
  lines.push('');
  lines.push('命令:');
  lines.push('  playback    执行声学混响参数回放');
  lines.push('  prepare   准备回放材料包');
  lines.push('  help      显示本帮助');
  lines.push('');
  lines.push('playback 选项:');
  lines.push('  -i, --input <dir>    输入目录（必填）');
  lines.push('  -o, --output <dir>   输出目录（必填）');
  lines.push('  --non-interactive      非交互模式，遇采样缺口自动挂起不询问');
  lines.push('');
  lines.push('prepare 选项:');
  lines.push('  -o, --output <dir>   材料输出目录（必填）');
  lines.push('');
  lines.push('示例:');
  lines.push('  # 准备材料包:');
  lines.push('  node src/cli.js prepare -o ./data/input');
  lines.push('');
  lines.push('  # 执行回放（交互模式）:');
  lines.push('  node src/cli.js playback -i ./data/input -o ./data/output');
  lines.push('');
  lines.push('  # 执行回放（非交互模式）:');
  lines.push('  node src/cli.js playback -i ./data/input -o ./data/output --non-interactive');
  lines.push('');
  console.log(lines.join('\n'));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: null,
    input: null,
    output: null,
    nonInteractive: false
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (!result.command && !arg.startsWith('-')) {
      result.command = arg;
      i++;
      continue;
    }
    if (arg === '-i' || arg === '--input') {
      result.input = args[i + 1];
      i += 2;
      continue;
    }
    if (arg === '-o' || arg === '--output') {
      result.output = args[i + 1];
      i += 2;
      continue;
    }
    if (arg === '--non-interactive') {
      result.nonInteractive = true;
      i++;
      continue;
    }
    if (arg === '-h' || arg === '--help' || arg === 'help') {
      result.command = 'help';
      i++;
      continue;
    }
    i++;
  }
  return result;
}

async function main() {
  const parsed = parseArgs(process.argv);
  const { command, input, output, nonInteractive } = parsed;

  if (!command || command === 'help') {
    printHelp();
    process.exit(command === 'help' ? 0 : 1);
  }

  if (command === 'prepare') {
    if (!output) {
      console.error(chalk.red('\n✗ 缺少 -o/--output 参数（材料输出目录）'));
      printHelp();
      process.exit(1);
    }
    try {
      const outputDir = path.resolve(output);
      console.log(chalk.cyan('\n========== 准备回放材料包 ==========\n'));
      prepareMaterials(outputDir);
      console.log(chalk.green('\n✓ 材料已生成至: ' + outputDir));
    } catch (err) {
      console.error(chalk.red('\n✗ 生成材料失败: ') + err.message);
      process.exit(1);
    }
    return;
  }

  if (command === 'playback') {
    if (!input || !output) {
      console.error(chalk.red('\n✗ 缺少必填参数：-i/--input (输入目录) 和 -o/--output (输出目录)'));
      printHelp();
      process.exit(1);
    }
    try {
      const inputDir = path.resolve(input);
      const outputDir = path.resolve(output);

      console.log(chalk.cyan('\n========== 声学混响参数回放 ==========\n'));
      console.log(chalk.gray('输入目录: ' + inputDir));
      console.log(chalk.gray('输出目录: ' + outputDir + '\n'));

      const result = await runPlayback({
        inputDir,
        outputDir,
        nonInteractive: nonInteractive
      });

      printSummary(result);

      if (result.hasErrors) {
        console.log(chalk.yellow('\n⚠  存在异常，请查看输出目录中的异常队列文件。'));
        process.exitCode = 1;
      } else if (result.suspended) {
        console.log(chalk.yellow('\n⏸  回放已挂起，待负责人确认采样缺口后再继续。'));
        process.exitCode = 2;
      } else {
        console.log(chalk.green('\n✓ 回放完成，一切正常。'));
      }
    } catch (err) {
      console.error(chalk.red('\n✗ 执行失败:') + ' ' + err.message);
      process.exit(1);
    }
    return;
  }

  console.error(chalk.red('\n✗ 未知命令: ') + command);
  printHelp();
  process.exit(1);
}

main().catch(err => {
  console.error(chalk.red('\n✗ 未捕获异常:') + ' ' + err.stack);
  process.exit(1);
});
