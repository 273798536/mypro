#!/usr/bin/env node

import { Command } from 'commander';
import { processThickness } from './commands/thickness.js';

const program = new Command();

program
  .name('lab-thickness')
  .description('薄膜镀层厚度估算 CLI 工具')
  .version('1.0.0');

program
  .command('thickness')
  .description('批量处理薄膜镀层厚度估算')
  .option('-i, --input <path>', '输入目录路径', './data')
  .option('-o, --output <path>', '输出目录路径', './results')
  .option('-a, --algorithm <type>', '算法: standard / degraded', 'standard')
  .option('--only-blank-missing', '仅处理空白对照缺失的记录', false)
  .option('--log-level <level>', '日志级别: info / warn / error', 'info')
  .action(async (options) => {
    try {
      const result = await processThickness({
        inputDir: options.input,
        outputDir: options.output,
        algorithm: options.algorithm,
        onlyBlankMissing: options.onlyBlankMissing,
        logLevel: options.logLevel,
      });

      console.log('');
      console.log('=== 处理完成 ===');
      console.log(`总计: ${result.total} 条`);
      console.log(`成功: ${result.success} 条`);
      console.log(`跳过: ${result.skipped} 条`);
      console.log(`失败: ${result.errors.length} 条`);

      if (result.errors.length > 0) {
        console.log('');
        console.log('错误详情:');
        result.errors.forEach((err: string, i: number) => {
          console.log(`  ${i + 1}. ${err}`);
        });
      }

      console.log('');
      console.log(`输出文件: ${result.outputFile}`);
      console.log(`摘要文件: ${result.summaryFile}`);
    } catch (err) {
      console.error('处理失败:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
