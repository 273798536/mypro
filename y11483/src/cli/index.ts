#!/usr/bin/env node
import 'reflect-metadata';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase } from '../config/database';
import { DataGenerator } from '../services/DataGenerator';
import { BatchTraceService, ConflictStrategy } from '../services/BatchTraceService';
import { ExportService, ExportFormat, ExportType } from '../services/ExportService';
import { SampleLabelService } from '../services/SampleLabelService';
import { AuditService, EntityType } from '../services/AuditService';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function main() {
  await initDatabase();

  const dataGenerator = new DataGenerator();
  const traceService = new BatchTraceService();
  const exportService = new ExportService();
  const sampleService = new SampleLabelService();
  const auditService = new AuditService();

  yargs(hideBin(process.argv))
    .command(
      'generate',
      '生成测试数据',
      (y) =>
        y
          .option('batch', { alias: 'b', type: 'string', demandOption: true, describe: '批次号' })
          .option('pot', { alias: 'p', type: 'string', demandOption: true, describe: '锅次号' })
          .option('product', { alias: 'n', type: 'string', default: '招牌红烧肉', describe: '产品名称' })
          .option('stores', { alias: 's', type: 'number', default: 5, describe: '门店数量' })
          .option('abnormal-temp', { type: 'boolean', default: false, describe: '包含异常温度' })
          .option('complaint', { type: 'boolean', default: false, describe: '包含投诉' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 开始生成测试数据 ===\n'));

        try {
          const result = await dataGenerator.generateBatchData({
            batchNo: argv.batch,
            potNo: argv.pot,
            productName: argv.product,
            storeCount: argv.stores,
            hasAbnormalTemp: argv['abnormal-temp'],
            hasComplaint: argv.complaint,
            operator: argv.operator,
          });

          console.log(chalk.green('✓ 留样标签:'), result.sampleLabel.id);
          console.log(chalk.green('✓ 温度记录:'), result.temperatureRecords.length, '条');
          console.log(chalk.green('✓ 门店交接:'), result.handovers.length, '条');
          console.log(chalk.green('✓ 门店投诉:'), result.complaints.length, '条');
          console.log(chalk.green('\n✓ 数据生成完成!\n'));
        } catch (error: any) {
          console.error(chalk.red('\n✗ 数据生成失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'trace-create',
      '创建批次链路',
      (y) =>
        y
          .option('batch', { alias: 'b', type: 'string', demandOption: true, describe: '批次号' })
          .option('pot', { alias: 'p', type: 'string', demandOption: true, describe: '锅次号' })
          .option('product', { alias: 'n', type: 'string', default: '招牌红烧肉', describe: '产品名称' })
          .option('strategy', { alias: 's', type: 'string', choices: ['ignore', 'overwrite', 'append', 'error'], default: 'error', describe: '冲突策略' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 创建批次链路 ===\n'));

        try {
          const trace = await traceService.createTrace({
            batchNo: argv.batch,
            potNo: argv.pot,
            productName: argv.product,
            productionTime: new Date(),
            conflictStrategy: argv.strategy as ConflictStrategy,
            operator: argv.operator,
          });

          console.log(chalk.green('✓ 链路编号:'), trace.traceNo);
          console.log(chalk.green('✓ 批次-锅次:'), `${trace.batchNo}-${trace.potNo}`);
          console.log(chalk.green('✓ 产品名称:'), trace.productName);
          console.log(chalk.green('✓ 当前状态:'), trace.status);
          console.log(chalk.green('✓ 版本号:'), trace.version);
          console.log(chalk.green('\n✓ 批次链路创建成功!\n'));
        } catch (error: any) {
          console.error(chalk.red('\n✗ 创建失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'trace-process',
      '处理批次链路',
      (y) =>
        y
          .option('trace', { alias: 't', type: 'string', demandOption: true, describe: '链路编号' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 处理批次链路 ===\n'));

        try {
          const trace = await traceService.processTrace({
            traceNo: argv.trace,
            operator: argv.operator,
          });

          console.log(chalk.green('✓ 链路编号:'), trace.traceNo);
          console.log(chalk.green('✓ 处理状态:'), trace.status);
          console.log(chalk.green('✓ 留样标签:'), trace.sampleLabelCount, '条');
          console.log(chalk.green('✓ 温度记录:'), trace.temperatureRecordCount, '条');
          console.log(chalk.green('✓ 门店投诉:'), trace.complaintCount, '条');
          console.log(chalk.green('✓ 门店交接:'), trace.handoverCount, '条');
          console.log(chalk.green('✓ 涉及门店:'), trace.totalStores, '家');
          console.log(chalk.green('✓ 已完成门店:'), trace.completedStores, '家');
          if (trace.hasAbnormalTemperature) console.log(chalk.yellow('⚠ 异常温度: 存在'));
          if (trace.hasComplaint) console.log(chalk.yellow('⚠ 门店投诉: 存在'));
          console.log(chalk.green('\n✓ 批次链路处理完成!\n'));
          console.log(chalk.gray('摘要:'), trace.summary, '\n');
        } catch (error: any) {
          console.error(chalk.red('\n✗ 处理失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'trace-stores',
      '查看链路涉及门店',
      (y) => y.option('trace', { alias: 't', type: 'string', demandOption: true, describe: '链路编号' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 链路涉及门店 ===\n'));

        try {
          const stores = await traceService.getTraceStores(argv.trace);

          if (stores.length === 0) {
            console.log(chalk.yellow('暂无门店数据\n'));
            return;
          }

          stores.forEach((store: any, index: number) => {
            console.log(chalk.cyan(`${index + 1}. ${store.storeName} (${store.storeCode})`));
            console.log('   交接单号:', store.handoverNo);
            console.log('   配送数量:', store.deliveredQuantity);
            console.log('   实收数量:', store.receivedQuantity);
            console.log('   状态:', store.status, '\n');
          });
        } catch (error: any) {
          console.error(chalk.red('\n✗ 查询失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'trace-history',
      '查看链路操作历史',
      (y) => y.option('trace', { alias: 't', type: 'string', demandOption: true, describe: '链路编号' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 链路操作历史 ===\n'));

        try {
          const history = await traceService.getTraceHistory(argv.trace);

          if (history.length === 0) {
            console.log(chalk.yellow('暂无操作记录\n'));
            return;
          }

          history.forEach((log: any, index: number) => {
            console.log(chalk.cyan(`${index + 1}. [${log.operationTime.toLocaleString()}]`));
            console.log('   操作员:', log.operator);
            console.log('   操作:', log.operationType);
            console.log('   状态变化:', `${log.oldStatus || '-'} → ${log.newStatus || '-'}`);
            console.log('   原因:', log.reason, '\n');
          });
        } catch (error: any) {
          console.error(chalk.red('\n✗ 查询失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'freeze',
      '冻结批次链路',
      (y) =>
        y
          .option('trace', { alias: 't', type: 'string', demandOption: true, describe: '链路编号' })
          .option('reason', { alias: 'r', type: 'string', demandOption: true, describe: '冻结原因' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 冻结批次链路 ===\n'));

        try {
          const trace = await traceService.freezeTrace({
            traceNo: argv.trace,
            operator: argv.operator,
            reason: argv.reason,
          });

          console.log(chalk.green('✓ 链路编号:'), trace.traceNo);
          console.log(chalk.green('✓ 当前状态:'), trace.status);
          console.log(chalk.green('✓ 冻结时间:'), trace.frozenAt?.toLocaleString());
          console.log(chalk.green('✓ 冻结人:'), trace.frozenBy);
          console.log(chalk.green('\n✓ 批次链路已冻结!\n'));
        } catch (error: any) {
          console.error(chalk.red('\n✗ 冻结失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'export',
      '导出批次链路',
      (y) =>
        y
          .option('trace', { alias: 't', type: 'string', demandOption: true, describe: '链路编号' })
          .option('format', { alias: 'f', type: 'string', choices: ['csv', 'json'], default: 'json', describe: '导出格式' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 导出批次链路 ===\n'));

        try {
          const exportRecord = await exportService.createExport({
            exportType: ExportType.FULL_TRACE,
            format: argv.format as ExportFormat,
            traceNo: argv.trace,
            operator: argv.operator,
          });

          console.log(chalk.green('✓ 导出编号:'), exportRecord.exportNo);
          console.log(chalk.blue('  正在执行导出...'));

          const result = await exportService.executeExport(exportRecord.exportNo, argv.operator);

          console.log(chalk.green('✓ 导出状态:'), result.status);
          console.log(chalk.green('✓ 记录数量:'), result.recordCount);
          console.log(chalk.green('✓ 文件路径:'), result.filePath);
          console.log(chalk.green('✓ 文件大小:'), result.fileSize, 'bytes');
          console.log(chalk.green('✓ 耗时:'), result.durationMs, 'ms');
          console.log(chalk.green('\n✓ 导出完成!\n'));
        } catch (error: any) {
          console.error(chalk.red('\n✗ 导出失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'full-flow',
      '执行完整流程: 造数 → 创建链路 → 处理 → 冻结 → 导出',
      (y) =>
        y
          .option('batch', { alias: 'b', type: 'string', demandOption: true, describe: '批次号' })
          .option('pot', { alias: 'p', type: 'string', demandOption: true, describe: '锅次号' })
          .option('product', { alias: 'n', type: 'string', default: '招牌红烧肉', describe: '产品名称' })
          .option('stores', { alias: 's', type: 'number', default: 5, describe: '门店数量' })
          .option('abnormal-temp', { type: 'boolean', default: false, describe: '包含异常温度' })
          .option('complaint', { type: 'boolean', default: false, describe: '包含投诉' })
          .option('operator', { alias: 'o', type: 'string', default: 'cli_user', describe: '操作员' })
          .option('format', { alias: 'f', type: 'string', choices: ['csv', 'json'], default: 'json', describe: '导出格式' }),
      async (argv) => {
        console.log(chalk.blue('\n╔══════════════════════════════════════════════════════╗'));
        console.log(chalk.blue('║          执行完整验收链路流程                          ║'));
        console.log(chalk.blue('╚══════════════════════════════════════════════════════╝\n'));

        try {
          console.log(chalk.yellow('步骤 1/5: 生成测试数据...'));
          await dataGenerator.generateBatchData({
            batchNo: argv.batch,
            potNo: argv.pot,
            productName: argv.product,
            storeCount: argv.stores,
            hasAbnormalTemp: argv['abnormal-temp'],
            hasComplaint: argv.complaint,
            operator: argv.operator,
          });
          console.log(chalk.green('✓ 数据生成完成\n'));

          console.log(chalk.yellow('步骤 2/5: 创建批次链路...'));
          const trace = await traceService.createTrace({
            batchNo: argv.batch,
            potNo: argv.pot,
            productName: argv.product,
            productionTime: new Date(),
            conflictStrategy: ConflictStrategy.OVERWRITE,
            operator: argv.operator,
          });
          console.log(chalk.green('✓ 链路创建完成:', trace.traceNo, '\n'));

          console.log(chalk.yellow('步骤 3/5: 处理批次链路...'));
          const processed = await traceService.processTrace({
            traceNo: trace.traceNo,
            operator: argv.operator,
          });
          console.log(chalk.green('✓ 链路处理完成 - 状态:', processed.status));
          console.log(chalk.gray('  涉及门店:', processed.totalStores, '家'));
          console.log(chalk.gray('  摘要:'), processed.summary, '\n');

          console.log(chalk.yellow('步骤 4/5: 冻结批次链路...'));
          const frozen = await traceService.freezeTrace({
            traceNo: trace.traceNo,
            operator: argv.operator,
            reason: '导出前冻结，确保数据一致性',
          });
          console.log(chalk.green('✓ 链路已冻结\n'));

          console.log(chalk.yellow('步骤 5/5: 导出批次链路...'));
          const exportRecord = await exportService.createExport({
            exportType: ExportType.FULL_TRACE,
            format: argv.format as ExportFormat,
            traceNo: trace.traceNo,
            operator: argv.operator,
          });
          const result = await exportService.executeExport(exportRecord.exportNo, argv.operator);
          console.log(chalk.green('✓ 导出完成 - 文件:'), result.filePath);
          console.log(chalk.green('✓ 记录数量:'), result.recordCount, '\n');

          console.log(chalk.green('╔══════════════════════════════════════════════════════╗'));
          console.log(chalk.green('║                 完整流程执行成功!                      ║'));
          console.log(chalk.green('╚══════════════════════════════════════════════════════╝\n'));

          console.log(chalk.cyan('链路编号:'), trace.traceNo);
          console.log(chalk.cyan('导出文件:'), result.filePath);
          console.log(chalk.cyan('查看历史:'), `npm run cli -- trace-history -t ${trace.traceNo}`);
          console.log(chalk.cyan('查看门店:'), `npm run cli -- trace-stores -t ${trace.traceNo}\n`);
        } catch (error: any) {
          console.error(chalk.red('\n✗ 流程执行失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'list-traces',
      '列出所有批次链路',
      (y) =>
        y
          .option('page', { type: 'number', default: 1, describe: '页码' })
          .option('size', { type: 'number', default: 10, describe: '每页数量' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 批次链路列表 ===\n'));

        try {
          const result = await traceService.listTraces(argv.page, argv.size);

          result.data.forEach((trace, index) => {
            console.log(chalk.cyan(`${(argv.page - 1) * argv.size + index + 1}. ${trace.traceNo}`));
            console.log('   批次-锅次:', `${trace.batchNo}-${trace.potNo}`);
            console.log('   产品:', trace.productName);
            console.log('   状态:', trace.status);
            console.log('   门店:', trace.totalStores, '家');
            console.log('   创建时间:', trace.createdAt.toLocaleString(), '\n');
          });

          console.log(chalk.gray(`共 ${result.total} 条记录，第 ${argv.page} 页\n`));
        } catch (error: any) {
          console.error(chalk.red('\n✗ 查询失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'operator-history',
      '查看操作员历史',
      (y) =>
        y
          .option('operator', { alias: 'o', type: 'string', demandOption: true, describe: '操作员' })
          .option('limit', { type: 'number', default: 20, describe: '记录数量' }),
      async (argv) => {
        console.log(chalk.blue('\n=== 操作员操作历史 ===\n'));

        try {
          const history = await auditService.getHistoryByOperator(argv.operator, argv.limit);

          if (history.length === 0) {
            console.log(chalk.yellow('暂无操作记录\n'));
            return;
          }

          history.forEach((log, index) => {
            console.log(chalk.cyan(`${index + 1}. [${log.operationTime.toLocaleString()}]`));
            console.log('   实体类型:', log.entityType);
            console.log('   实体编号:', log.entityNo);
            console.log('   操作:', log.operationType);
            console.log('   原因:', log.reason, '\n');
          });
        } catch (error: any) {
          console.error(chalk.red('\n✗ 查询失败:'), error.message, '\n');
          process.exit(1);
        }
      }
    )
    .command(
      'server',
      '启动HTTP API服务',
      (y) => y.option('port', { type: 'number', default: 3000, describe: '端口号' }),
      async (argv) => {
        process.env.PORT = String(argv.port);
        require('../server/index');
      }
    )
    .demandCommand()
    .strict()
    .help()
    .epilogue('中央厨房留样验收回放链路服务 - CLI工具').argv;
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});