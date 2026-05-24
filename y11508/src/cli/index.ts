#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../db/data-source';
import { DatabaseService } from '../db/service';
import { MockDataGenerator } from '../imports/mock-generator';
import { StatusLinkEngine } from '../engine/status-link';
import { ReportService } from '../reports';
import { DataImportService } from '../imports';
import { HttpClient } from '../http/client';
import { ImportSource } from '../types';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface CliContext {
  dbService?: DatabaseService;
  statusEngine?: StatusLinkEngine;
  reportService?: ReportService;
  importService?: DataImportService;
}

const ctx: CliContext = {};

async function initDb(): Promise<void> {
  if (!ctx.dbService) {
    await initializeDatabase();
    ctx.dbService = new DatabaseService();
    ctx.statusEngine = new StatusLinkEngine(ctx.dbService);
    ctx.reportService = new ReportService(ctx.dbService);
    ctx.importService = new DataImportService(ctx.dbService);
  }
}

yargs(hideBin(process.argv))
  .scriptName('mdic')
  .usage('$0 <命令> [选项]')
  .command(
    'mock',
    '生成测试数据',
    (y) => y
      .option('users', { type: 'boolean', description: '生成用户数据', default: false })
      .option('devices', { type: 'number', description: '生成设备数量', default: 0 })
      .option('inspections', { type: 'number', description: '生成巡检记录数量', default: 0 })
      .option('certificates', { type: 'number', description: '生成校准证书数量', default: 0 })
      .option('quotes', { type: 'number', description: '生成维修报价数量', default: 0 })
      .option('confirms', { type: 'number', description: '生成二次确认单数量', default: 0 })
      .option('all', { type: 'boolean', description: '生成所有测试数据', default: false }),
    async (args) => {
      try {
        await initDb();
        const generator = new MockDataGenerator(ctx.dbService!);

        if (args.all) {
          await generator.generateAllMockData();
          process.exit(0);
        }

        if (args.users) {
          await generator.generateUsers();
          console.log('✓ 用户数据生成完成');
        }
        if (args.devices > 0) {
          await generator.generateDevices(args.devices);
          console.log(`✓ 生成 ${args.devices} 条设备数据`);
        }
        if (args.inspections > 0) {
          await generator.generateInspectionRecords(args.inspections);
          console.log(`✓ 生成 ${args.inspections} 条巡检记录`);
        }
        if (args.certificates > 0) {
          await generator.generateCalibrationCertificates(args.certificates);
          console.log(`✓ 生成 ${args.certificates} 条校准证书`);
        }
        if (args.quotes > 0) {
          await generator.generateMaintenanceQuotes(args.quotes);
          console.log(`✓ 生成 ${args.quotes} 条维修报价`);
        }
        if (args.confirms > 0) {
          await generator.generateSecondaryConfirms(args.confirms);
          console.log(`✓ 生成 ${args.confirms} 条二次确认单`);
        }

        process.exit(0);
      } catch (error) {
        console.error('生成测试数据失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'start',
    '启动 API 服务',
    (y) => y
      .option('port', { type: 'number', description: '服务端口', default: 3000 })
      .option('host', { type: 'string', description: '绑定地址', default: '0.0.0.0' }),
    async (args) => {
      try {
        process.env.PORT = String(args.port);
        const { startServer } = await import('../server/index');
        await startServer();
      } catch (error) {
        console.error('启动服务失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'status-check',
    '执行状态联动检查',
    (y) => y
      .option('device', { type: 'string', description: '指定设备编号' }),
    async (args) => {
      try {
        await initDb();
        console.log('执行状态联动检查...');

        let results;
        if (args.device) {
          const result = await ctx.statusEngine!.checkCertificateRenewal(args.device);
          results = result ? [result] : [];
        } else {
          results = await ctx.statusEngine!.runFullStatusCheck();
        }

        if (results.length === 0) {
          console.log('✓ 无状态变更');
        } else {
          console.log(`✓ 完成 ${results.length} 项状态变更:`);
          results.forEach((r: any, i: number) => {
            console.log(`  ${i + 1}. ${r.deviceCode}: ${r.oldStatus} → ${r.newStatus}`);
            console.log(`     原因: ${r.reason}`);
          });
        }
        process.exit(0);
      } catch (error) {
        console.error('状态检查失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'import <source> <file>',
    '导入数据',
    (y) => y
      .positional('source', {
        type: 'string',
        description: '数据来源: inspection|calibration|maintenance_quote|secondary_confirm',
        required: true
      })
      .positional('file', {
        type: 'string',
        description: 'CSV 文件路径',
        required: true
      })
      .option('user', { type: 'string', description: '操作用户', default: 'cli_user' }),
    async (args) => {
      try {
        await initDb();
        console.log(`开始导入 ${args.source} 数据...`);

        const source = args.source as ImportSource;
        let result;

        switch (source) {
          case ImportSource.INSPECTION:
            result = await ctx.importService!.importInspectionRecordsFromCSV(args.file as string, args.user);
            break;
          case ImportSource.CALIBRATION:
            result = await ctx.importService!.importCalibrationCertificatesFromCSV(args.file as string, args.user);
            break;
          case ImportSource.MAINTENANCE_QUOTE:
            result = await ctx.importService!.importMaintenanceQuotesFromCSV(args.file as string, args.user);
            break;
          case ImportSource.SECONDARY_CONFIRM:
            result = await ctx.importService!.importSecondaryConfirmsFromCSV(args.file as string, args.user);
            break;
          default:
            console.error('无效的数据来源');
            process.exit(1);
        }

        console.log(`
导入结果:
  总计: ${result.total}
  成功: ${result.imported}
  失败: ${result.failed}
        `);

        if (result.errors.length > 0) {
          console.log('错误详情:');
          result.errors.forEach(e => {
            console.log(`  行 ${e.row}: ${e.error}`);
          });
          process.exit(2);
        }

        process.exit(0);
      } catch (error) {
        console.error('导入失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'reconcile',
    '执行设备记录对账',
    () => { },
    async () => {
      try {
        await initDb();
        console.log('执行设备记录对账...');

        const results = await ctx.reportService!.reconcileDeviceRecords();

        console.log(`
对账结果:
  设备总数: ${results.length}
  有问题: ${results.filter(r => r.issues.length > 0).length}
        `);

        const issues = results.filter(r => r.issues.length > 0);
        if (issues.length > 0) {
          console.log('问题设备:');
          issues.forEach(r => {
            console.log(`  ${r.deviceCode} (${r.deviceName}):`);
            r.issues.forEach(issue => console.log(`    - ${issue}`));
          });
        }

        process.exit(issues.length > 0 ? 2 : 0);
      } catch (error) {
        console.error('对账失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'export <type> [output]',
    '导出报表',
    (y) => y
      .positional('type', {
        type: 'string',
        description: '报表类型: devices|inspections|certificates|reconciliation',
        required: true
      })
      .positional('output', {
        type: 'string',
        description: '输出文件路径',
        default: ''
      }),
    async (args) => {
      try {
        await initDb();
        console.log(`导出 ${args.type} 报表...`);

        let csvContent: string;
        const reportType = args.type as string;

        switch (reportType) {
          case 'devices':
            csvContent = await ctx.reportService!.exportDeviceStatusReport();
            break;
          case 'inspections':
            csvContent = await ctx.reportService!.exportInspectionReport();
            break;
          case 'certificates':
            csvContent = await ctx.reportService!.exportCertificateReport();
            break;
          case 'reconciliation':
            csvContent = await ctx.reportService!.exportReconciliationReport();
            break;
          default:
            console.error('无效的报表类型');
            process.exit(1);
            return;
        }

        const outputPath = (args.output as string) || `${reportType}-report.csv`;
        fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8');
        console.log(`✓ 报表已导出到: ${outputPath}`);

        process.exit(0);
      } catch (error) {
        console.error('导出失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'request <method> <url>',
    '发送 HTTP 请求',
    (y) => y
      .positional('method', { type: 'string', description: 'HTTP 方法', required: true })
      .positional('url', { type: 'string', description: '请求 URL', required: true })
      .option('data', { type: 'string', description: '请求体 JSON' })
      .option('user', { type: 'string', description: '用户身份', default: 'admin' })
      .option('base-url', { type: 'string', description: 'API 基础地址', default: 'http://localhost:3000/api' }),
    async (args) => {
      try {
        const client = new HttpClient(args['base-url']);
        client.setUserContext(args.user);

        const method = (args.method as string).toUpperCase();
        let response;

        switch (method) {
          case 'GET':
            response = await client.get(args.url as string);
            break;
          case 'POST':
            response = await client.post(args.url as string, args.data ? JSON.parse(args.data) : undefined);
            break;
          case 'PUT':
            response = await client.put(args.url as string, args.data ? JSON.parse(args.data) : undefined);
            break;
          case 'DELETE':
            response = await client.delete(args.url as string);
            break;
          default:
            console.error('不支持的 HTTP 方法');
            process.exit(1);
            return;
        }

        console.log(JSON.stringify(response, null, 2));
        process.exit(response.success ? 0 : 3);
      } catch (error) {
        console.error('请求失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'dashboard',
    '查看仪表盘统计',
    () => { },
    async () => {
      try {
        await initDb();
        const stats = await ctx.reportService!.getDashboardStats();

        console.log(`
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  🏥  医疗器械巡检仪表盘                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  设备统计:                                                   │
│    总数: ${String(stats.totalDevices).padEnd(4)}                                       │
│    按状态: ${JSON.stringify(stats.devicesByStatus)}                   │
│                                                             │
│  巡检记录: ${String(stats.totalInspections).padEnd(4)}                                     │
│    按状态: ${JSON.stringify(stats.inspectionsByStatus)}                   │
│                                                             │
│  校准证书: ${String(stats.totalCertificates).padEnd(4)}  (过期: ${String(stats.expiredCertificates).padEnd(4)})          │
│                                                             │
│  维修报价: ${String(stats.totalQuotes).padEnd(4)}  (待审批: ${String(stats.quotesPendingApproval).padEnd(4)})           │
│                                                             │
│  二次确认: ${String(stats.totalConfirms).padEnd(4)}                                     │
│                                                             │
│  导入失败: ${String(stats.importFailures).padEnd(4)}                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
        `);

        process.exit(0);
      } catch (error) {
        console.error('获取统计数据失败:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'replay <script-file>',
    '执行回放脚本',
    (y) => y
      .positional('script-file', { type: 'string', description: '回放脚本文件路径', required: true })
      .option('user', { type: 'string', description: '用户身份', default: 'admin' })
      .option('base-url', { type: 'string', description: 'API 基础地址', default: 'http://localhost:3000/api' }),
    async (args) => {
      try {
        const scriptContent = fs.readFileSync(args['script-file'] as string, 'utf8');
        const commands = JSON.parse(scriptContent);

        const client = new HttpClient(args['base-url']);
        client.setUserContext(args.user);

        console.log(`执行回放脚本，共 ${commands.length} 条命令...`);

        const results: any[] = [];
        let hasError = false;

        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i];
          const startTime = Date.now();

          console.log(`\n[${i + 1}/${commands.length}] ${cmd.type}: ${cmd.description || cmd.content}`);

          try {
            let result: any;
            if (cmd.type === 'http') {
              const requestData = typeof cmd.content === 'string' ? JSON.parse(cmd.content) : cmd.content;
              result = await client.request(requestData);
            } else if (cmd.type === 'script') {
              result = { executed: true };
            }

            const duration = Date.now() - startTime;
            console.log(`  ✓ 成功 (${duration}ms)`);
            if (cmd.verbose) {
              console.log('  结果:', JSON.stringify(result).substring(0, 200));
            }

            results.push({ index: i + 1, success: true, duration, result });
          } catch (error: any) {
            const duration = Date.now() - startTime;
            console.log(`  ✗ 失败 (${duration}ms): ${error.message}`);
            hasError = true;
            results.push({ index: i + 1, success: false, duration, error: error.message });
          }

          if (cmd.delay) {
            await new Promise(resolve => setTimeout(resolve, cmd.delay));
          }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`
回放完成:
  总计: ${commands.length}
  成功: ${successCount}
  失败: ${commands.length - successCount}
        `);

        process.exit(hasError ? 4 : 0);
      } catch (error) {
        console.error('回放失败:', error);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, '请指定一个命令')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilog(`
退出码说明:
  0 - 成功
  1 - 执行错误
  2 - 对账发现问题
  3 - HTTP 请求失败
  4 - 回放命令失败
  `)
  .parse();