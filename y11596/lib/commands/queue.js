const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');

const {
  getWorkspaceRoot
} = require('../utils/file-manager');

const {
  getRetryQueueStats,
  readRetryQueue,
  readDeadLetterQueue,
  processRetryQueue,
  moveToDeadLetter,
  requeueFromDeadLetter,
  clearCompletedRetryItems,
  clearDeadLetterQueue
} = require('../utils/queue-manager');

const {
  getCurrentUser,
  assertPermission,
  ROLES
} = require('../utils/auth');

const queueCommand = new Command('queue')
  .description('重试队列和死信队列管理');

queueCommand
  .command('status')
  .description('查看队列状态')
  .action(() => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser(root);
    assertPermission('queue-deadletter', {}, user);

    const stats = getRetryQueueStats(root);
    printQueueStats(stats);
  });

queueCommand
  .command('retry')
  .description('处理重试队列')
  .option('--dry-run', '试运行，不实际处理')
  .option('--all', '处理所有待重试项', true)
  .action((options) => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser(root);
    assertPermission('queue-retry', {}, user);

    if (options.dryRun) {
      const queue = readRetryQueue(root).filter(i => i.status === 'pending');
      console.log(chalk.cyan(`📋 待处理重试项: ${queue.length} 条`));
      queue.slice(0, 5).forEach(item => {
        console.log(`  ${item.id} - ${item.action} - ${item.error?.substring(0, 50)}`);
      });
      return;
    }

    const results = processRetryQueue(root, (item) => {
      return retryImportItem(root, item);
    });

    printRetryResults(results);
  });

queueCommand
  .command('deadletter')
  .description('查看死信队列')
  .option('--move <id>', '将指定重试项移至死信队列')
  .option('--requeue <id>', '将死信项重新加入重试队列')
  .option('--clear', '清空死信队列')
  .option('--reason <text>', '移动原因')
  .action((options) => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser(root);
    assertPermission('queue-deadletter', options, user);

    if (options.move) {
      const item = moveToDeadLetter(root, options.move, options.reason);
      console.log(chalk.green(`✅ 已移至死信队列: ${item.deadLetterId}`));
      return;
    }

    if (options.requeue) {
      const item = requeueFromDeadLetter(root, options.requeue);
      console.log(chalk.green(`✅ 已重新加入重试队列: ${item.id}`));
      return;
    }

    if (options.clear) {
      if (user.role !== ROLES.ADMIN) {
        console.log(chalk.red('❌ 仅管理员可清空死信队列'));
        process.exit(1);
      }
      const count = clearDeadLetterQueue(root);
      console.log(chalk.green(`✅ 已清空死信队列，移除 ${count} 条记录`));
      return;
    }

    const deadLetter = readDeadLetterQueue(root);
    printDeadLetterQueue(deadLetter);
  });

queueCommand
  .command('clear-completed')
  .description('清理已完成的重试项')
  .action(() => {
    const root = getWorkspaceRoot();
    const user = getCurrentUser(root);
    assertPermission('queue-retry', {}, user);

    const count = clearCompletedRetryItems(root);
    console.log(chalk.green(`✅ 已清理 ${count} 条已完成的重试项`));
  });

function retryImportItem(root, item) {
  const { parseCSV, parseJSON, validateRecord, detectDataType } = require('../utils/parser');
  const { createSnapshot } = require('../utils/diff-utils');
  const fs = require('fs');
  const path = require('path');
  const {
    getWorkspacePaths,
    readJson,
    writeJson,
    generateId,
    getTimestamp,
    readState,
    writeState
  } = require('../utils/file-manager');
  const paths = getWorkspacePaths(root);

  try {
    if (!item.originalData || !item.dataType) {
      return { success: false, error: '缺少原始数据或数据类型信息' };
    }

    const record = item.originalData;
    const dataType = item.dataType;
    const recordId = item.recordId || `${dataType}-${item.rowNumber}`;

    const validation = validateRecord(record, dataType);
    if (!validation.valid) {
      return {
        success: false,
        error: `验证失败: ${validation.errors.join('; ')}`,
        retryable: true
      };
    }

    const existingDataPath = path.join(paths.parsed, `${dataType}.json`);
    const existingData = readJson(existingDataPath) || [];
    const existingIds = new Set(existingData.map(r => r.recordId));

    const isDuplicate = existingIds.has(recordId);
    if (isDuplicate) {
      return {
        success: false,
        error: `记录 ${recordId} 已存在`,
        retryable: false
      };
    }

    const importId = generateId();
    const batchId = generateId();
    const importTime = getTimestamp();

    const importRecord = {
      importId,
      batchId,
      recordId,
      dataType,
      importTime,
      rowNumber: record.rowNumber,
      source: record.source,
      rawData: record.rawData,
      parsedData: record.parsedData,
      status: 'retry_imported',
      isResubmit: false,
      manualOverride: false,
      checkStatus: 'pending',
      retrySource: {
        queueId: item.id,
        retryCount: item.retryCount,
        originalError: item.error
      }
    };

    const snapshotBefore = createSnapshot(existingData);
    existingData.push(importRecord);
    writeJson(existingDataPath, existingData);
    const snapshotAfter = createSnapshot(existingData);

    const state = readState(root);
    state.importStats = state.importStats || {};
    state.importStats[dataType] = state.importStats[dataType] || { total: 0, valid: 0, invalid: 0 };
    state.importStats[dataType].total += 1;
    state.importStats[dataType].valid += 1;
    writeState(root, state);

    const historyEntry = {
      action: 'retry_import',
      importId,
      batchId,
      dataType,
      timestamp: importTime,
      sourceQueueId: item.id,
      retryCount: item.retryCount,
      snapshotBefore,
      snapshotAfter,
      summary: {
        total: 1,
        success: 1,
        failed: 0,
        skipped: 0,
        duplicate: 0
      }
    };

    const historyPath = path.join(paths.history, `retry-import-${importId}.json`);
    writeJson(historyPath, historyEntry);

    return {
      success: true,
      data: {
        recordId,
        importId,
        batchId,
        importTime
      }
    };
  } catch (e) {
    return { success: false, error: e.message, retryable: true };
  }
}

function printQueueStats(stats) {
  console.log(chalk.cyan('📊 队列状态:'));
  console.log('');

  const table = new Table({
    head: [chalk.cyan('队列'), chalk.cyan('状态'), chalk.cyan('数量')],
    colWidths: [15, 15, 10]
  });

  table.push(
    ['重试队列', '待处理', chalk.yellow(stats.retry.pending)],
    ['重试队列', '处理中', chalk.cyan(stats.retry.processing)],
    ['重试队列', '已完成', chalk.green(stats.retry.completed)],
    ['重试队列', '已移死信', chalk.red(stats.retry.deadLetter)],
    ['死信队列', '总计', chalk.red(stats.deadLetter.total)]
  );

  console.log(table.toString());
}

function printRetryResults(results) {
  console.log(chalk.cyan('🔄 重试处理结果:'));
  console.log('');

  const table = new Table({
    head: [chalk.cyan('项目'), chalk.cyan('数量')],
    colWidths: [25, 15]
  });

  table.push(
    ['处理总数', results.processed],
    ['成功', chalk.green(results.succeeded)],
    ['失败', chalk.red(results.failed)],
    ['移至死信', chalk.red(results.movedToDeadLetter)]
  );

  console.log(table.toString());

  if (results.items.length > 0) {
    console.log('');
    console.log(chalk.cyan('📋 处理详情:'));
    results.items.slice(0, 5).forEach(item => {
      const statusColor = item.status === 'completed' ? chalk.green : 
                         item.status === 'dead_letter' ? chalk.red : chalk.yellow;
      console.log(`  ${statusColor(`[${item.status}]`)} ${item.id} - 重试 ${item.retryCount} 次`);
      if (item.lastError) {
        console.log(`    错误: ${item.lastError.substring(0, 60)}`);
      }
    });
  }
}

function printDeadLetterQueue(deadLetter) {
  if (deadLetter.length === 0) {
    console.log(chalk.green('✅ 死信队列为空'));
    return;
  }

  console.log(chalk.red('💀 死信队列:'));
  console.log('');

  const table = new Table({
    head: [
      chalk.cyan('死信ID'),
      chalk.cyan('操作'),
      chalk.cyan('重试次数'),
      chalk.cyan('错误'),
      chalk.cyan('移入时间')
    ],
    colWidths: [20, 10, 10, 35, 25]
  });

  deadLetter.slice(0, 10).forEach(item => {
    table.push([
      item.deadLetterId?.substring(0, 15) || item.id?.substring(0, 15),
      item.action,
      item.retryCount,
      (item.lastError || item.error || '').substring(0, 30),
      item.movedToDeadLetterAt?.substring(0, 19) || ''
    ]);
  });

  console.log(table.toString());

  if (deadLetter.length > 10) {
    console.log(chalk.gray(`  ... 还有 ${deadLetter.length - 10} 条记录`));
  }
}

module.exports = queueCommand;
