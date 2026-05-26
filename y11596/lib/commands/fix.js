const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const Table = require('cli-table3');

const {
  getWorkspaceRoot,
  getWorkspacePaths,
  readJson,
  writeJson,
  generateId,
  getTimestamp
} = require('../utils/file-manager');

const {
  compareObjects,
  createSnapshot
} = require('../utils/diff-utils');

const { DATA_TYPES, TYPE_CONFIG } = require('../utils/parser');

const {
  getCurrentUser,
  assertPermission,
  ROLES
} = require('../utils/auth');

const fixCommand = new Command('fix')
  .description('人工改判问题项')
  .option('-t, --type <type>', '指定数据类型')
  .option('--record <recordId>', '指定记录ID改判')
  .option('--status <status>', '改判状态: pass|fail|warning', 'pass')
  .option('--reason <reason>', '改判理由', '')
  .option('--list', '列出所有问题项')
  .option('--all', '批量改判所有问题项')
  .action((options) => {
    const user = getCurrentUser();
    assertPermission('fix', options, user);

    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目'));
      process.exit(1);
    }

    const paths = getWorkspacePaths(root);
    const latestCheck = readJson(path.join(paths.check, 'latest.json'));

    if (!latestCheck) {
      console.log(chalk.yellow('⚠️  未找到最近检查记录，请先执行 check 命令'));
      process.exit(1);
    }

    const allIssues = collectAllIssues(latestCheck);

    if (options.list) {
      listIssues(allIssues);
      return;
    }

    let issuesToFix = [];
    if (options.record) {
      issuesToFix = allIssues.filter(i => i.recordId === options.record);
      if (issuesToFix.length === 0) {
        console.log(chalk.red(`❌ 找不到记录: ${options.record}`));
        process.exit(1);
      }
    } else if (options.all) {
      issuesToFix = allIssues;
    } else if (options.type) {
      issuesToFix = allIssues.filter(i => i.dataType === options.type);
    } else {
      console.log(chalk.yellow('⚠️  请指定改判范围:'));
      console.log(`  ${chalk.white('--record <id>')} - 改判单个记录`);
      console.log(`  ${chalk.white('--type <type>')} - 改判某数据类型`);
      console.log(`  ${chalk.white('--all')} - 改判所有问题项`);
      console.log(`  ${chalk.white('--list')} - 列出所有问题项`);
      process.exit(0);
    }

    if (issuesToFix.length === 0) {
      console.log(chalk.green('✅ 没有需要改判的问题项'));
      return;
    }

    const fixId = generateId();
    const fixTime = getTimestamp();
    const fixes = [];

    for (const issue of issuesToFix) {
      const fixRecord = performFix(
        paths,
        issue,
        options.status,
        options.reason,
        fixId,
        fixTime
      );
      fixes.push(fixRecord);
    }

    saveFixHistory(paths, fixId, fixTime, fixes, options);

    console.log(chalk.green(`✅ 完成 ${fixes.length} 条改判`));
    console.log(`  改判ID: ${chalk.gray(fixId)}`);
    console.log(`  新状态: ${chalk.cyan(options.status)}`);
    console.log('');
    console.log(chalk.cyan('下一步:'));
    console.log(`  ${chalk.white('kbase-audit check')} - 重新执行检查`);
    console.log(`  ${chalk.white('kbase-audit history')} - 查看改判历史`);
  });

function collectAllIssues(checkResults) {
  const issues = [];

  for (const [dataType, typeResult] of Object.entries(checkResults.dataTypeResults)) {
    for (const recordIssue of typeResult.issues) {
      issues.push({
        ...recordIssue,
        dataType,
        dataTypeName: typeResult.name
      });
    }
  }

  for (const crossIssue of checkResults.crossChecks?.issues || []) {
    issues.push({
      ...crossIssue,
      dataType: 'cross_check',
      dataTypeName: '跨检查'
    });
  }

  return issues;
}

function listIssues(issues) {
  if (issues.length === 0) {
    console.log(chalk.green('✅ 没有问题项'));
    return;
  }

  console.log(chalk.cyan('📋 问题项列表:'));
  console.log('');

  const table = new Table({
    head: [
      chalk.cyan('#'),
      chalk.cyan('类型'),
      chalk.cyan('记录ID'),
      chalk.cyan('行号'),
      chalk.cyan('来源文件'),
      chalk.cyan('问题')
    ],
    colWidths: [5, 12, 18, 8, 25, 40]
  });

  issues.slice(0, 20).forEach((issue, idx) => {
    const typeColor = issue.severity === 'error' ? chalk.red : chalk.yellow;
    table.push([
      idx + 1,
      typeColor(issue.dataTypeName || issue.dataType),
      issue.recordId || '-',
      issue.rowNumber || '-',
      issue.sourceFile || '-',
      issue.message?.substring(0, 35) + (issue.message?.length > 35 ? '...' : '')
    ]);
  });

  console.log(table.toString());

  if (issues.length > 20) {
    console.log(chalk.gray(`  ... 还有 ${issues.length - 20} 条问题项`));
  }

  console.log('');
  console.log(chalk.cyan('总计:'), issues.length, '条问题项');
}

function performFix(paths, issue, newStatus, reason, fixId, fixTime) {
  const dataType = issue.dataType;
  
  if (dataType === 'cross_check' || !Object.values(DATA_TYPES).includes(dataType)) {
    return {
      issue,
      newStatus,
      reason,
      fixId,
      fixTime,
      note: '跨检查问题，标记为已处理'
    };
  }

  const dataPath = path.join(paths.parsed, `${dataType}.json`);
  const records = readJson(dataPath) || [];
  const recordIndex = records.findIndex(r => r.recordId === issue.recordId);

  if (recordIndex < 0) {
    return {
      issue,
      newStatus,
      reason,
      fixId,
      fixTime,
      error: '记录不存在'
    };
  }

  const record = records[recordIndex];
  const oldStatus = record.checkStatus;

  const snapshotBefore = createSnapshot(record);

  record.manualOverride = true;
  record.overrideStatus = newStatus;
  record.overrideReason = reason;
  record.overrideTime = fixTime;
  record.overrideId = fixId;
  record.checkStatus = newStatus;

  if (!record.overrideHistory) {
    record.overrideHistory = [];
  }
  record.overrideHistory.push({
    fixId,
    oldStatus,
    newStatus,
    reason,
    timestamp: fixTime,
    snapshotBefore
  });

  records[recordIndex] = record;
  writeJson(dataPath, records);

  const snapshotAfter = createSnapshot(record);
  const differences = compareObjects(snapshotBefore.data, snapshotAfter.data);

  return {
    recordId: issue.recordId,
    dataType,
    rowNumber: issue.rowNumber,
    sourceFile: issue.sourceFile,
    oldStatus,
    newStatus,
    reason,
    fixId,
    fixTime,
    differences,
    originalEvidence: {
      rawData: record.rawData,
      source: record.source,
      parsedData: record.parsedData
    }
  };
}

function saveFixHistory(paths, fixId, fixTime, fixes, options) {
  const historyPath = path.join(paths.history, `fix-${fixId}.json`);
  
  const historyEntry = {
    action: 'fix',
    fixId,
    timestamp: fixTime,
    options: {
      status: options.status,
      reason: options.reason
    },
    totalFixed: fixes.length,
    fixes
  };

  writeJson(historyPath, historyEntry);
}

module.exports = fixCommand;
