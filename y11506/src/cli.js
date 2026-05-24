#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const { initDatabase, getDbPath, closeDatabase } = require('./db/database');
const { importData, listBatches, getBatchInfo, getBatchErrors, IMPORT_MODES, SOURCE_TYPES } = require('./services/importService');
const { validateBatch, validateAll, getValidationErrors } = require('./services/validationService');
const { fixCertificateStatus, applyFixFromError, getFixSuggestions, markErrorFixed } = require('./services/fixService');
const { generateBatchReport, generateStatusReport, generateDepartmentReport } = require('./services/reportService');
const { getRecentHistory, getBatchHistory, getOperatorHistory, getRecordHistory, getChangeSummary } = require('./services/historyService');
const { exportBatchData, exportFailedRecords, exportCalibrationStatus, exportReport } = require('./services/exportService');
const { recoverStuckTasks, getTaskStats, getTasksByStatus, retryTask, markAsManual, TASK_STATUSES } = require('./services/taskService');

const program = new Command();

const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  VALIDATION_ERRORS: 2,
  NOT_FOUND: 3,
  INVALID_INPUT: 4
};

program
  .name('mdinspect')
  .description('医疗器械巡检多源导入巡检 CLI 工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化数据库')
  .action(async () => {
    try {
      initDatabase();
      console.log(chalk.green('✓ 数据库初始化成功'));
      console.log(chalk.gray(`  数据库路径: ${getDbPath()}`));
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 初始化失败:'), error.message);
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('import')
  .description('导入数据')
  .requiredOption('-t, --type <type>', `数据类型: ${Object.values(SOURCE_TYPES).join(', ')}`)
  .requiredOption('-f, --file <path>', 'CSV 文件路径')
  .option('-m, --mode <mode>', `导入模式: ${Object.values(IMPORT_MODES).join(', ')}`, IMPORT_MODES.APPEND)
  .option('-o, --operator <name>', '操作人')
  .option('--no-validate', '跳过数据验证')
  .action(async (options) => {
    try {
      initDatabase();
      
      console.log(chalk.blue(`正在导入数据...`));
      console.log(chalk.gray(`  类型: ${options.type}`));
      console.log(chalk.gray(`  文件: ${options.file}`));
      console.log(chalk.gray(`  模式: ${options.mode}`));
      
      const result = await importData(options.type, options.file, {
        mode: options.mode,
        operator: options.operator,
        validate: options.validate !== false
      });
      
      console.log(chalk.green('\n✓ 导入完成'));
      console.log(`  批次ID: ${chalk.cyan(result.batchId)}`);
      console.log(`  总行数: ${result.totalRows}`);
      console.log(`  成功: ${chalk.green(result.successRows)}`);
      console.log(`  失败: ${chalk.red(result.failedRows)}`);
      
      if (result.failedRows > 0) {
        console.log(chalk.yellow(`\n  提示: 使用 mdinspect check ${result.batchId} 查看错误详情`));
      }
      
      closeDatabase();
      process.exit(result.failedRows > 0 ? EXIT_CODES.VALIDATION_ERRORS : EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 导入失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('check')
  .description('检查数据验证结果')
  .argument('[batchId]', '批次ID (可选，不填则检查全部)')
  .option('--all', '检查全部数据状态')
  .option('--department <name>', '按科室检查')
  .option('--json', '输出JSON格式')
  .action(async (batchId, options) => {
    try {
      initDatabase();
      
      if (options.all) {
        const report = validateAll();
        
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(chalk.blue('\n=== 整体状态检查 ==='));
          console.log(`\n  校准证书状态:`);
          console.log(`    已过期: ${chalk.red(report.expiredCertificates)}`);
          console.log(`    30天内过期: ${chalk.yellow(report.expiringCertificates)}`);
          console.log(`    状态联动问题: ${chalk.yellow(report.linkageIssues)}`);
          
          if (report.details && report.details.linkageIssues.length > 0) {
            console.log(chalk.yellow(`\n  提示: 使用 mdinspect fix --linkage 修复联动问题`));
          }
        }
      } else if (options.department) {
        const report = generateDepartmentReport(options.department);
        
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(chalk.blue(`\n=== 科室检查: ${options.department} ===`));
          console.log(`\n  概览:`);
          console.log(`    巡检记录: ${report.summary.inspectionCount}`);
          console.log(`    维修报价: ${report.summary.repairCount}`);
          console.log(`    设备数量: ${report.summary.deviceCount}`);
          console.log(`    有问题设备: ${chalk.yellow(report.summary.devicesWithIssues)}`);
          
          if (report.devicesWithIssues.length > 0) {
            console.log(`\n  有问题设备:`);
            report.devicesWithIssues.forEach(d => {
              console.log(`    - ${d.deviceId}: ${d.issue}`);
            });
          }
        }
      } else if (batchId) {
        const result = validateBatch(batchId);
        const errors = getValidationErrors(batchId, true);
        
        if (options.json) {
          console.log(JSON.stringify({ validation: result, errors }, null, 2));
        } else {
          console.log(chalk.blue(`\n=== 批次检查: ${batchId} ===`));
          console.log(`\n  数据类型: ${result.sourceType}`);
          console.log(`  总记录数: ${result.totalRecords}`);
          console.log(`  有效: ${chalk.green(result.validRecords)}`);
          console.log(`  无效: ${chalk.red(result.invalidRecords)}`);
          
          if (errors.length > 0) {
            const table = new Table({
              head: ['行号', '错误代码', '字段', '错误信息'],
              colWidths: [8, 20, 15, 40]
            });
            
            errors.slice(0, 20).forEach(e => {
              table.push([
                e.original_line_no,
                e.error_code,
                e.field_name || '-',
                e.error_message.substring(0, 37) + (e.error_message.length > 37 ? '...' : '')
              ]);
            });
            
            console.log(`\n  错误详情:`);
            console.log(table.toString());
            
            if (errors.length > 20) {
              console.log(chalk.gray(`  还有 ${errors.length - 20} 条错误未显示`));
            }
            
            console.log(chalk.yellow(`\n  提示: 使用 mdinspect fix --batch ${batchId} 自动修复`));
          }
        }
      } else {
        const report = generateStatusReport();
        
        if (options.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(chalk.blue('\n=== 系统状态 ==='));
          console.log(`\n  数据概览:`);
          console.log(`    巡检记录: ${report.overview.totalInspectionRecords}`);
          console.log(`    校准证书: ${report.overview.totalCalibrationCertificates}`);
          console.log(`    维修报价: ${report.overview.totalRepairQuotes}`);
          
          console.log(`\n  待处理问题:`);
          console.log(`    过期证书: ${chalk.red(report.calibrationStatus.expiredCertificates)}`);
          console.log(`    即将过期: ${chalk.yellow(report.calibrationStatus.expiringCertificates)}`);
          console.log(`    联动问题: ${chalk.yellow(report.calibrationStatus.linkageIssues)}`);
          console.log(`    验证错误: ${chalk.yellow(report.issues.pendingValidationErrors)}`);
          
          if (report.imports.recentBatches.length > 0) {
            console.log(`\n  最近导入:`);
            report.imports.recentBatches.slice(0, 5).forEach(b => {
              const statusColor = b.status === 'completed' ? chalk.green : 
                                 b.status === 'completed_with_errors' ? chalk.yellow : chalk.red;
              console.log(`    ${b.batch_id.substring(0, 8)}... ${b.source_type} ${b.file_name} ${statusColor(b.status)}`);
            });
          }
        }
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 检查失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('fix')
  .description('修复数据问题')
  .option('-b, --batch <id>', '批次ID')
  .option('-e, --error <id>', '错误ID')
  .option('--linkage', '修复证书状态联动问题')
  .option('--all', '修复所有可自动修复的问题')
  .option('-o, --operator <name>', '操作人')
  .action(async (options) => {
    try {
      initDatabase();
      
      let fixedCount = 0;
      const operator = options.operator || process.env.USER || 'system';
      
      if (options.linkage || options.all) {
        const batches = listBatches(100);
        for (const batch of batches) {
          fixedCount += fixCertificateStatus(batch.batch_id, operator);
        }
        console.log(chalk.green(`✓ 修复了 ${fixedCount} 条证书状态联动问题`));
      }
      
      if (options.batch) {
        const errors = getValidationErrors(options.batch, true);
        for (const error of errors) {
          try {
            if (applyFixFromError(error.id, operator)) {
              fixedCount++;
            }
          } catch (e) {
          }
        }
        console.log(chalk.green(`✓ 批次 ${options.batch} 已修复 ${fixedCount} 条问题`));
      }
      
      if (options.error) {
        if (applyFixFromError(parseInt(options.error), operator)) {
          fixedCount++;
          console.log(chalk.green(`✓ 错误 ${options.error} 已修复`));
        } else {
          console.log(chalk.yellow(`该错误无法自动修复: ${getFixSuggestions('UNKNOWN')}`));
        }
      }
      
      if (fixedCount === 0 && !options.linkage && !options.all && !options.batch && !options.error) {
        console.log(chalk.yellow('请指定修复范围: --batch, --error, --linkage, 或 --all'));
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 修复失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('report')
  .description('生成报告')
  .argument('[batchId]', '批次ID')
  .option('-t, --type <type>', '报告类型: batch, status, department')
  .option('-d, --department <name>', '科室名称')
  .option('-o, --output <path>', '输出文件路径 (JSON)')
  .action(async (batchId, options) => {
    try {
      initDatabase();
      
      let report;
      
      if (options.type === 'department' || options.department) {
        report = generateDepartmentReport(options.department || batchId);
        console.log(chalk.blue(`\n=== 科室报告: ${report.department} ===`));
      } else if (options.type === 'status' || !batchId) {
        report = generateStatusReport();
        console.log(chalk.blue('\n=== 系统状态报告 ==='));
      } else {
        report = generateBatchReport(batchId);
        console.log(chalk.blue(`\n=== 批次报告: ${batchId} ===`));
      }
      
      if (options.output) {
        exportReport(report, options.output);
        console.log(chalk.green(`✓ 报告已导出到: ${options.output}`));
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 生成报告失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('history')
  .description('查看变更历史')
  .option('-b, --batch <id>', '按批次查看')
  .option('-o, --operator <name>', '按操作人查看')
  .option('-r, --record <type:id>', '按记录查看 (如: inspection:123)')
  .option('-d, --days <n>', '最近N天', '7')
  .option('--limit <n>', '显示条数', '50')
  .option('--summary', '显示汇总统计')
  .action(async (options) => {
    try {
      initDatabase();
      
      let history;
      
      if (options.summary) {
        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - parseInt(options.days) * 24 * 60 * 60 * 1000).toISOString();
        history = getChangeSummary(startDate, endDate);
        
        console.log(chalk.blue(`\n=== 变更汇总 (最近 ${options.days} 天) ===`));
        history.forEach(item => {
          console.log(`  ${item.change_date} | ${item.record_type} | ${item.operation_type} | ${item.operator} | ${item.change_count}条`);
        });
      } else if (options.batch) {
        history = getBatchHistory(options.batch, parseInt(options.limit));
        console.log(chalk.blue(`\n=== 批次历史: ${options.batch} ===`));
      } else if (options.operator) {
        history = getOperatorHistory(options.operator, parseInt(options.limit));
        console.log(chalk.blue(`\n=== 操作人历史: ${options.operator} ===`));
      } else if (options.record) {
        const [type, id] = options.record.split(':');
        history = getRecordHistory(type, parseInt(id), parseInt(options.limit));
        console.log(chalk.blue(`\n=== 记录历史: ${options.record} ===`));
      } else {
        history = getRecentHistory(parseInt(options.days), parseInt(options.limit));
        console.log(chalk.blue(`\n=== 最近历史 (${options.days}天) ===`));
      }
      
      if (!options.summary && history.length > 0) {
        const table = new Table({
          head: ['时间', '类型', '操作', '字段', '值变化', '操作人'],
          colWidths: [20, 12, 8, 12, 25, 10]
        });
        
        history.forEach(h => {
          const oldVal = (h.old_value || '').substring(0, 10);
          const newVal = (h.new_value || '').substring(0, 10);
          table.push([
            h.created_at.substring(0, 19),
            h.record_type,
            h.operation_type,
            h.field_name,
            `${oldVal} → ${newVal}`,
            h.operator || '-'
          ]);
        });
        
        console.log(table.toString());
      } else if (!options.summary) {
        console.log(chalk.gray('  暂无历史记录'));
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 查询历史失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('export')
  .description('导出数据')
  .argument('<batchId>', '批次ID 或 all')
  .requiredOption('-o, --output <dir>', '输出目录')
  .option('--failed', '只导出失败记录')
  .option('--calibration-status', '导出台账状态')
  .option('--expired', '只导过期的')
  .option('--expiring', '只导即将过期的')
  .action(async (batchId, options) => {
    try {
      initDatabase();
      
      let result;
      
      if (options.calibrationStatus || batchId === 'calibration') {
        result = exportCalibrationStatus(options.output, {
          expiredOnly: options.expired,
          expiringSoon: options.expiring,
          activeOnly: true
        });
        console.log(chalk.green(`✓ 校准状态已导出: ${result.exportPath}`));
        console.log(chalk.gray(`  共 ${result.recordCount} 条记录`));
      } else if (options.failed) {
        result = exportFailedRecords(batchId, options.output);
        console.log(chalk.green(`✓ 失败记录已导出`));
        console.log(chalk.gray(`  错误文件: ${result.errorFile}`));
        if (result.failedRecordsFile) {
          console.log(chalk.gray(`  失败数据: ${result.failedRecordsFile}`));
        }
        console.log(chalk.gray(`  共 ${result.errorCount} 个错误`));
      } else if (batchId !== 'all') {
        result = exportBatchData(batchId, options.output);
        console.log(chalk.green(`✓ 批次数据已导出: ${result.exportPath}`));
        console.log(chalk.gray(`  共 ${result.recordCount} 条记录`));
      } else {
        console.log(chalk.yellow('请指定导出内容'));
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 导出失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('tasks')
  .description('管理异步任务')
  .option('--list', '列出任务')
  .option('--status <status>', '按状态筛选')
  .option('--stats', '任务统计')
  .option('--retry <taskId>', '重试任务')
  .option('--manual <taskId>', '标记为需要人工处理')
  .option('--recover', '恢复卡住的任务')
  .action(async (options) => {
    try {
      initDatabase();
      
      if (options.recover) {
        const recovered = recoverStuckTasks();
        console.log(chalk.green(`✓ 恢复了 ${recovered} 个卡住的任务`));
      } else if (options.retry) {
        retryTask(options.retry);
        console.log(chalk.green(`✓ 任务 ${options.retry} 已加入重试队列`));
      } else if (options.manual) {
        markAsManual(options.manual);
        console.log(chalk.green(`✓ 任务 ${options.manual} 已标记为需要人工处理`));
      } else if (options.stats) {
        const stats = getTaskStats();
        console.log(chalk.blue('\n=== 任务统计 ==='));
        stats.forEach(s => {
          console.log(`  ${s.status}: ${s.count}`);
        });
      } else if (options.list) {
        const status = options.status || TASK_STATUSES.PENDING;
        const tasks = getTasksByStatus(status);
        console.log(chalk.blue(`\n=== 任务列表 (${status}) ===`));
        tasks.forEach(t => {
          console.log(`  ${t.task_id.substring(0, 12)}... ${t.task_type} (重试: ${t.retry_count}/${t.max_retries})`);
          if (t.error_message) {
            console.log(chalk.red(`    错误: ${t.error_message}`));
          }
        });
      } else {
        console.log(chalk.yellow('请指定操作: --list, --stats, --retry, --manual, 或 --recover'));
      }
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 操作失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program
  .command('batches')
  .description('查看导入批次列表')
  .option('-l, --limit <n>', '显示条数', '20')
  .action(async (options) => {
    try {
      initDatabase();
      
      const batches = listBatches(parseInt(options.limit));
      
      console.log(chalk.blue('\n=== 导入批次 ==='));
      
      const table = new Table({
        head: ['批次ID', '类型', '文件', '模式', '状态', '成功/失败'],
        colWidths: [38, 12, 20, 10, 18, 12]
      });
      
      batches.forEach(b => {
        const statusColor = b.status === 'completed' ? chalk.green : 
                           b.status === 'completed_with_errors' ? chalk.yellow : 
                           b.status === 'processing' ? chalk.blue : chalk.red;
        table.push([
          b.batch_id,
          b.source_type,
          b.file_name || '-',
          b.import_mode,
          statusColor(b.status),
          `${b.success_rows}/${b.failed_rows}`
        ]);
      });
      
      console.log(table.toString());
      
      closeDatabase();
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      console.error(chalk.red('✗ 查询失败:'), error.message);
      closeDatabase();
      process.exit(EXIT_CODES.ERROR);
    }
  });

program.parseAsync(process.argv);
