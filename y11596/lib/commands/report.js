const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Table = require('cli-table3');
const { Parser } = require('json2csv');

const {
  getWorkspaceRoot,
  getWorkspacePaths,
  readJson,
  writeJson,
  generateId,
  getTimestamp,
  ensureDir
} = require('../utils/file-manager');

const {
  getCurrentUser,
  assertPermission,
  maskSensitiveData,
  ROLES
} = require('../utils/auth');

const reportCommand = new Command('report')
  .description('生成巡检报告')
  .option('-c, --check <checkId>', '指定检查ID生成报告')
  .option('-f, --format <format>', '报告格式: json|csv|html', 'json')
  .option('-o, --output <path>', '输出文件路径')
  .option('--show-failures', '显示失败清单')
  .option('--show-source', '显示来源信息')
  .action((options) => {
    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目'));
      process.exit(1);
    }

    const user = getCurrentUser(root);
    assertPermission('report', options, user);

    const paths = getWorkspacePaths(root);

    let checkResults;
    if (options.check) {
      const checkPath = path.join(paths.check, `check-${options.check}.json`);
      checkResults = readJson(checkPath);
      if (!checkResults) {
        console.log(chalk.red(`❌ 找不到检查记录: ${options.check}`));
        process.exit(1);
      }
    } else {
      checkResults = readJson(path.join(paths.check, 'latest.json'));
      if (!checkResults) {
        console.log(chalk.yellow('⚠️  未找到最近检查记录，请先执行 check 命令'));
        process.exit(1);
      }
    }

    console.log(chalk.cyan('📄 生成巡检报告...'));
    console.log('');

    const reportId = generateId();
    const reportTime = getTimestamp();

    const report = buildReport(checkResults, reportId, reportTime, paths);

    let outputPath = options.output;
    if (!outputPath) {
      const ext = options.format === 'csv' ? '.csv' : '.json';
      outputPath = path.join(paths.reports, `report-${reportId}${ext}`);
    }

    ensureDir(path.dirname(outputPath));

    if (options.format === 'csv') {
      outputCSV(report, outputPath, options);
    } else if (options.format === 'html') {
      outputHTML(report, outputPath);
    } else {
      writeJson(outputPath, report);
    }

    printReportSummary(report, options);

    console.log('');
    console.log(chalk.green('✅ 报告生成完成!'));
    console.log(`  报告ID: ${chalk.gray(reportId)}`);
    console.log(`  输出文件: ${chalk.gray(outputPath)}`);
    console.log('');
    console.log(chalk.cyan('下一步:'));
    console.log(`  ${chalk.white('kbase-audit fix')} - 人工改判问题项`);
    console.log(`  ${chalk.white('kbase-audit export')} - 导出最终数据`);
  });

function buildReport(checkResults, reportId, reportTime, paths) {
  const report = {
    reportId,
    generatedAt: reportTime,
    checkId: checkResults.checkId,
    checkTime: checkResults.timestamp,
    batchId: checkResults.batchId,
    summary: {
      ...checkResults.summary,
      dataTypes: {}
    },
    failureList: [],
    warningList: [],
    riskList: checkResults.riskItems || [],
    sourceTraces: [],
    crossCheckIssues: checkResults.crossChecks?.issues || [],
    statistics: {}
  };

  for (const [dataType, typeResult] of Object.entries(checkResults.dataTypeResults)) {
    report.summary.dataTypes[dataType] = {
      name: typeResult.name,
      total: typeResult.total,
      passed: typeResult.passed,
      failed: typeResult.failed,
      warnings: typeResult.warnings
    };

    for (const recordIssue of typeResult.issues) {
      const listItem = {
        dataType,
        dataTypeName: typeResult.name,
        recordId: recordIssue.recordId,
        rowNumber: recordIssue.rowNumber,
        sourceFile: recordIssue.sourceFile,
        issueType: recordIssue.type,
        message: recordIssue.message,
        severity: recordIssue.type === 'status' ? 'error' : 'warning'
      };

      if (recordIssue.type === 'status') {
        report.failureList.push(listItem);
      } else {
        report.warningList.push(listItem);
      }

      report.sourceTraces.push({
        recordId: recordIssue.recordId,
        dataType,
        rowNumber: recordIssue.rowNumber,
        sourceFile: recordIssue.sourceFile,
        issues: [recordIssue.message]
      });
    }
  }

  for (const crossIssue of checkResults.crossChecks?.issues || []) {
    const item = {
      category: crossIssue.category,
      recordId: crossIssue.recordId,
      rowNumber: crossIssue.rowNumber,
      sourceFile: crossIssue.sourceFile,
      message: crossIssue.message,
      severity: crossIssue.type
    };

    if (crossIssue.type === 'error') {
      report.failureList.push(item);
    } else {
      report.warningList.push(item);
    }
  }

  report.failureList.sort((a, b) => {
    if (a.rowNumber && b.rowNumber) return a.rowNumber - b.rowNumber;
    return 0;
  });

  report.statistics = {
    bySourceFile: aggregateBySource(report.failureList, report.warningList),
    byIssueType: aggregateByIssueType(report.failureList, report.warningList),
    failureRate: checkResults.summary.totalRecords > 0 
      ? ((report.failureList.length / checkResults.summary.totalRecords) * 100).toFixed(2) + '%'
      : '0%'
  };

  return report;
}

function aggregateBySource(failures, warnings) {
  const sourceMap = {};

  [...failures, ...warnings].forEach(item => {
    const source = item.sourceFile || 'unknown';
    if (!sourceMap[source]) {
      sourceMap[source] = { source, errors: 0, warnings: 0, records: [] };
    }
    if (item.severity === 'error') {
      sourceMap[source].errors++;
    } else {
      sourceMap[source].warnings++;
    }
    sourceMap[source].records.push(item.rowNumber);
  });

  return Object.values(sourceMap);
}

function aggregateByIssueType(failures, warnings) {
  const typeMap = {};

  [...failures, ...warnings].forEach(item => {
    const type = item.issueType || item.category || 'unknown';
    if (!typeMap[type]) {
      typeMap[type] = { type, count: 0 };
    }
    typeMap[type].count++;
  });

  return Object.values(typeMap);
}

function outputCSV(report, outputPath, options) {
  const allIssues = [
    ...report.failureList.map(f => ({ ...f, level: 'FAIL' })),
    ...report.warningList.map(w => ({ ...w, level: 'WARN' }))
  ];

  const fields = [
    'level',
    'dataTypeName',
    'recordId',
    'rowNumber',
    'sourceFile',
    'issueType',
    'category',
    'message'
  ];

  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(allIssues);
    fs.writeFileSync(outputPath, '\ufeff' + csv, 'utf8');
  } catch (e) {
    console.log(chalk.yellow(`⚠️  CSV 生成失败，使用 JSON: ${e.message}`));
    writeJson(outputPath, report);
  }
}

function outputHTML(report, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>知识库巡检报告 - ${report.reportId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .meta { font-size: 14px; opacity: 0.9; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .summary-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .summary-card .label { font-size: 14px; color: #666; margin-bottom: 8px; }
    .summary-card .value { font-size: 28px; font-weight: 700; }
    .value.pass { color: #52c41a; }
    .value.fail { color: #ff4d4f; }
    .value.warn { color: #faad14; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .section h2 { font-size: 18px; margin-bottom: 16px; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
    th { background: #fafafa; font-weight: 600; color: #666; font-size: 13px; }
    tr:hover { background: #fafafa; }
    .tag { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .tag.fail { background: #fff2f0; color: #ff4d4f; }
    .tag.warn { background: #fffbe6; color: #faad14; }
    .row-number { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    .risk-item { padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
    .risk-item.high { background: #fff2f0; border-left: 4px solid #ff4d4f; }
    .risk-item.medium { background: #fffbe6; border-left: 4px solid #faad14; }
    .risk-item .level { font-weight: 600; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
    .source-file { font-family: monospace; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 客服知识库巡检报告</h1>
      <div class="meta">
        报告ID: ${report.reportId} | 生成时间: ${report.generatedAt} | 检查ID: ${report.checkId}
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">总记录数</div>
        <div class="value">${report.summary.totalRecords}</div>
      </div>
      <div class="summary-card">
        <div class="label">通过检查</div>
        <div class="value pass">${report.summary.passed}</div>
      </div>
      <div class="summary-card">
        <div class="label">检查失败</div>
        <div class="value fail">${report.failureList.length}</div>
      </div>
      <div class="summary-card">
        <div class="label">警告项</div>
        <div class="value warn">${report.warningList.length}</div>
      </div>
    </div>

    ${report.riskList.length > 0 ? `
    <div class="section">
      <h2>⚠️ 风险项</h2>
      ${report.riskList.map(risk => `
        <div class="risk-item ${risk.level}">
          <div class="level">${risk.level}</div>
          <div>${risk.message}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>❌ 失败清单</h2>
      <table>
        <thead>
          <tr>
            <th>级别</th>
            <th>数据类型</th>
            <th>记录ID</th>
            <th>原始行号</th>
            <th>来源文件</th>
            <th>问题描述</th>
          </tr>
        </thead>
        <tbody>
          ${report.failureList.map(item => `
            <tr>
              <td><span class="tag fail">FAIL</span></td>
              <td>${item.dataTypeName || item.category}</td>
              <td>${item.recordId || '-'}</td>
              <td>${item.rowNumber ? `<span class="row-number">行 ${item.rowNumber}</span>` : '-'}</td>
              <td><span class="source-file">${item.sourceFile || '-'}</span></td>
              <td>${item.message}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>⚠️ 警告清单</h2>
      <table>
        <thead>
          <tr>
            <th>级别</th>
            <th>数据类型</th>
            <th>记录ID</th>
            <th>原始行号</th>
            <th>来源文件</th>
            <th>问题描述</th>
          </tr>
        </thead>
        <tbody>
          ${report.warningList.map(item => `
            <tr>
              <td><span class="tag warn">WARN</span></td>
              <td>${item.dataTypeName || item.category}</td>
              <td>${item.recordId || '-'}</td>
              <td>${item.rowNumber ? `<span class="row-number">行 ${item.rowNumber}</span>` : '-'}</td>
              <td><span class="source-file">${item.sourceFile || '-'}</span></td>
              <td>${item.message}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📊 按来源文件统计</h2>
      <table>
        <thead>
          <tr>
            <th>来源文件</th>
            <th>错误数</th>
            <th>警告数</th>
            <th>涉及行号</th>
          </tr>
        </thead>
        <tbody>
          ${report.statistics.bySourceFile.map(source => `
            <tr>
              <td><span class="source-file">${source.source}</span></td>
              <td class="value fail">${source.errors}</td>
              <td class="value warn">${source.warnings}</td>
              <td>${[...new Set(source.records)].sort((a,b)=>a-b).slice(0, 10).map(r => `<span class="row-number">${r}</span>`).join(' ')}${source.records.length > 10 ? ' ...' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');
}

function printReportSummary(report, options) {
  console.log(chalk.cyan('📊 报告汇总:'));

  const summaryTable = new Table({
    head: [chalk.cyan('项目'), chalk.cyan('数量')],
    colWidths: [30, 15]
  });

  summaryTable.push(
    ['总记录数', report.summary.totalRecords],
    ['通过检查', chalk.green(report.summary.passed)],
    ['失败项', chalk.red(report.failureList.length)],
    ['警告项', chalk.yellow(report.warningList.length)],
    ['风险项', report.riskList.length],
    ['失败率', report.statistics.failureRate]
  );

  console.log(summaryTable.toString());
  console.log('');

  if (options.showFailures && report.failureList.length > 0) {
    console.log(chalk.red('❌ 失败清单:'));
    const failTable = new Table({
      head: [
        chalk.cyan('数据类型'),
        chalk.cyan('记录ID'),
        chalk.cyan('行号'),
        chalk.cyan('问题')
      ],
      colWidths: [15, 20, 10, 45]
    });

    report.failureList.slice(0, 10).forEach(item => {
      failTable.push([
        item.dataTypeName || item.category || '-',
        item.recordId || '-',
        item.rowNumber || '-',
        item.message
      ]);
    });

    console.log(failTable.toString());
    if (report.failureList.length > 10) {
      console.log(chalk.gray(`  ... 还有 ${report.failureList.length - 10} 条失败记录`));
    }
    console.log('');
  }

  if (options.showSource) {
    console.log(chalk.cyan('📁 按来源文件统计:'));
    const sourceTable = new Table({
      head: [chalk.cyan('来源文件'), chalk.cyan('错误'), chalk.cyan('警告')],
      colWidths: [40, 10, 10]
    });

    report.statistics.bySourceFile.forEach(source => {
      sourceTable.push([
        source.source,
        chalk.red(source.errors),
        chalk.yellow(source.warnings)
      ]);
    });

    console.log(sourceTable.toString());
  }
}

module.exports = reportCommand;
