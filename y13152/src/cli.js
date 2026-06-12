#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { runPlayback } = require('./playback');
const { prepareMaterials } = require('./materials');
const { printSummary } = require('./summary');

const program = new Command();

program
  .name('reverb-playback')
  .description('声学混响参数回放工具')
  .version('1.0.0');

program
  .command('playback')
  .description('执行声学混响参数回放')
  .requiredOption('-i, --input <dir>', '输入目录（包含参数记录、维修备注等材料）')
  .requiredOption('-o, --output <dir>', '输出目录（回放结果、异常队列等）')
  .option('--non-interactive', '非交互模式，遇采样缺口自动挂起不询问', false)
  .action(async (options) => {
    try {
      const inputDir = path.resolve(options.input);
      const outputDir = path.resolve(options.output);

      console.log(chalk.cyan('\n========== 声学混响参数回放 ==========\n'));
      console.log(chalk.gray(`输入目录: ${inputDir}`));
      console.log(chalk.gray(`输出目录: ${outputDir}\n`));

      const result = await runPlayback({
        inputDir,
        outputDir,
        nonInteractive: options.nonInteractive
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
      console.error(chalk.red('\n✗ 执行失败:'), err.message);
      process.exit(1);
    }
  });

program
  .command('prepare')
  .description('准备回放材料包（生成维修备注、正常记录、后补说明等示例）')
  .requiredOption('-o, --output <dir>', '材料输出目录')
  .action((options) => {
    try {
      const outputDir = path.resolve(options.output);
      console.log(chalk.cyan('\n========== 准备回放材料包 ==========\n'));
      prepareMaterials(outputDir);
      console.log(chalk.green(`\n✓ 材料已生成至: ${outputDir}`));
    } catch (err) {
      console.error(chalk.red('\n✗ 生成材料失败:'), err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
