const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Table = require('cli-table3');

const {
  getWorkspaceRoot,
  getWorkspacePaths,
  readJson
} = require('../utils/file-manager');

const { compareObjects, getChangeSummary } = require('../utils/diff-utils');

const historyCommand = new Command('history')
  .description('查看操作历史和前后差异')
  .option('-a, --action <action>', '按动作类型过滤: import|fix|check|export', '')
  .option('-n, --limit <number>', '显示最近 N 条记录', '20')
  .option('--diff <id>', '查看指定记录的详细差异')
  .option('--raw', '显示原始 JSON')
  .action((options) => {
    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目'));
      process.exit(1);
    }

    const paths = getWorkspacePaths(root);
    const historyFiles = fs.readdirSync(paths.history)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (options.diff) {
      showDiffDetail(paths, options.diff, options.raw);
      return;
    }

    let historyEntries = [];
    for (const file of historyFiles.slice(0, parseInt(options.limit))) {
      const entry = readJson(path.join(paths.history, file));
      if (entry && (!options.action || entry.action === options.action)) {
        historyEntries.push(entry);
      }
    }

    if (historyEntries.length === 0) {
      console.log(chalk.yellow('⚠️  暂无历史记录'));
      return;
    }

    printHistoryList(historyEntries, options.raw);
  });

function printHistoryList(entries, showRaw) {
  console.log(chalk.cyan('📜 操作历史:'));
  console.log('');

  const table = new Table({
    head: [
      chalk.cyan('时间'),
      chalk.cyan('动作'),
      chalk.cyan('ID'),
      chalk.cyan('摘要')
    ],
    colWidths: [25, 12, 18, 45]
  });

  for (const entry of entries) {
    const actionColor = getActionColor(entry.action);
    const summary = getSummaryText(entry);

    table.push([
      formatTimestamp(entry.timestamp),
      actionColor(entry.action),
      entry.importId || entry.fixId || entry.checkId || entry.exportId || '-',
      summary
    ]);
  }

  console.log(table.toString());
  console.log('');
  console.log(chalk.cyan('查看详细差异:'));
  console.log(`  ${chalk.white('kbase-audit history --diff <ID>')}`);

  if (showRaw && entries.length > 0) {
    console.log('');
    console.log(chalk.cyan('原始数据 (第一条):'));
    console.log(JSON.stringify(entries[0], null, 2));
  }
}

function showDiffDetail(paths, id, showRaw) {
  const historyFiles = fs.readdirSync(paths.history)
    .filter(f => f.includes(id) && f.endsWith('.json'));

  if (historyFiles.length === 0) {
    console.log(chalk.red(`❌ 找不到历史记录: ${id}`));
    process.exit(1);
  }

  const entry = readJson(path.join(paths.history, historyFiles[0]));

  console.log(chalk.cyan('🔍 历史记录详情:'));
  console.log('');
  console.log(`  动作: ${chalk.white(entry.action)}`);
  console.log(`  时间: ${chalk.white(entry.timestamp)}`);
  console.log(`  ID: ${chalk.white(id)}`);
  console.log('');

  if (entry.action === 'import') {
    showImportDiff(entry);
  } else if (entry.action === 'fix') {
    showFixDiff(entry);
  }

  if (showRaw) {
    console.log('');
    console.log(chalk.cyan('原始数据:'));
    console.log(JSON.stringify(entry, null, 2));
  }
}

function showImportDiff(entry) {
  if (!entry.snapshotBefore || !entry.snapshotAfter) {
    console.log(chalk.gray('无快照数据'));
    return;
  }

  const differences = compareObjects(
    entry.snapshotBefore.data,
    entry.snapshotAfter.data
  );

  const summary = getChangeSummary(differences);

  console.log(chalk.cyan('📊 导入前后差异摘要:'));
  console.log(`  新增: ${chalk.green(summary.added)}`);
  console.log(`  删除: ${chalk.red(summary.removed)}`);
  console.log(`  修改: ${chalk.yellow(summary.changed)}`);
  console.log('');

  if (differences.length > 0) {
    console.log(chalk.cyan('🔄 详细变更 (前10条):'));
    console.log('');
    differences.slice(0, 10).forEach((diff, idx) => {
      const typeColor = diff.type === 'added' ? chalk.green : 
                        diff.type === 'removed' ? chalk.red : chalk.yellow;
      console.log(`  ${idx + 1}. ${typeColor(`[${diff.type}]`)} ${diff.path}`);
      if (diff.oldValue !== undefined) {
        console.log(`     旧值: ${truncate(String(diff.oldValue))}`);
      }
      if (diff.newValue !== undefined) {
        console.log(`     新值: ${truncate(String(diff.newValue))}`);
      }
    });
  }
}

function showFixDiff(entry) {
  console.log(chalk.cyan('🔧 改判记录:'));
  console.log(`  批量改判数量: ${chalk.white(entry.totalFixed)}`);
  console.log(`  改判后状态: ${chalk.white(entry.options?.status || '-')}`);
  console.log(`  改判理由: ${chalk.gray(entry.options?.reason || '无')}`);
  console.log('');

  if (entry.fixes && entry.fixes.length > 0) {
    console.log(chalk.cyan('📋 详细改判 (前5条):'));
    console.log('');
    
    entry.fixes.slice(0, 5).forEach((fix, idx) => {
      console.log(`  ${idx + 1}. ${chalk.cyan(fix.recordId || 'N/A')}`);
      console.log(`     数据类型: ${fix.dataType || '-'}`);
      console.log(`     原始行号: ${chalk.gray(fix.rowNumber || '-')}`);
      console.log(`     来源文件: ${chalk.gray(fix.sourceFile || '-')}`);
      console.log(`     状态变化: ${chalk.red(fix.oldStatus)} → ${chalk.green(fix.newStatus)}`);
      
      if (fix.differences && fix.differences.length > 0) {
        console.log(`     字段变更: ${fix.differences.length} 处`);
      }
      
      if (fix.originalEvidence) {
        console.log(`     ⚠️  保留原始证据，不可覆盖`);
      }
      console.log('');
    });

    if (entry.fixes.length > 5) {
      console.log(chalk.gray(`  ... 还有 ${entry.fixes.length - 5} 条改判记录`));
    }
  }
}

function getActionColor(action) {
  const colors = {
    import: chalk.green,
    fix: chalk.yellow,
    check: chalk.cyan,
    export: chalk.magenta
  };
  return colors[action] || chalk.white;
}

function getSummaryText(entry) {
  if (entry.action === 'import') {
    return `导入 ${entry.summary?.total || 0} 条，成功 ${entry.summary?.success || 0}，失败 ${entry.summary?.failed || 0}`;
  }
  if (entry.action === 'fix') {
    return `改判 ${entry.totalFixed || 0} 条记录`;
  }
  if (entry.summary) {
    return `检查 ${entry.summary?.checkedRecords || 0} 条记录`;
  }
  return '-';
}

function formatTimestamp(ts) {
  if (!ts) return '-';
  const date = new Date(ts);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function truncate(str, maxLen = 50) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

module.exports = historyCommand;
