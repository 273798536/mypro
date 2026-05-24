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
  getTimestamp,
  readState,
  writeState
} = require('../utils/file-manager');

const {
  compareObjects,
  createSnapshot,
  getChangeSummary
} = require('../utils/diff-utils');

const { DATA_TYPES, TYPE_CONFIG } = require('../utils/parser');

const checkCommand = new Command('check')
  .description('执行巡检检查')
  .option('-b, --batch <batchId>', '指定批次检查')
  .option('-t, --type <type>', '指定数据类型检查')
  .option('--strict', '严格模式')
  .action((options) => {
    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目'));
      process.exit(1);
    }

    const state = readState(root);
    const paths = getWorkspacePaths(root);
    const config = readJson(paths.config);

    console.log(chalk.cyan('🔍 执行巡检检查...'));
    console.log('');

    const checkId = generateId();
    const checkTime = getTimestamp();
    const batchId = options.batch || state.currentBatch;

    const checkResults = {
      checkId,
      timestamp: checkTime,
      batchId,
      strict: options.strict || false,
      summary: {
        totalRecords: 0,
        checkedRecords: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        issues: []
      },
      dataTypeResults: {},
      crossChecks: {},
      issues: [],
      riskItems: []
    };

    const dataTypes = options.type 
      ? [options.type] 
      : Object.values(DATA_TYPES);

    const allData = {};
    for (const dataType of dataTypes) {
      const dataPath = path.join(paths.parsed, `${dataType}.json`);
      allData[dataType] = readJson(dataPath) || [];
    }

    for (const dataType of dataTypes) {
      const records = allData[dataType] || [];
      const typeConfig = TYPE_CONFIG[dataType];
      
      const typeResult = {
        dataType,
        name: typeConfig?.name || dataType,
        total: records.length,
        passed: 0,
        failed: 0,
        warnings: 0,
        issues: [],
        records: []
      };

      for (const record of records) {
        checkResults.summary.totalRecords++;
        
        const recordCheck = {
          recordId: record.recordId,
          rowNumber: record.rowNumber,
          sourceFile: record.source?.file,
          checks: {},
          status: 'pass',
          issues: []
        };

        const statusCheck = checkRecordStatus(record, dataType);
        recordCheck.checks.status = statusCheck;
        if (!statusCheck.passed) {
          recordCheck.status = 'fail';
          recordCheck.issues.push(...statusCheck.issues);
          typeResult.issues.push({
            recordId: record.recordId,
            rowNumber: record.rowNumber,
            sourceFile: record.source?.file,
            type: 'status',
            message: statusCheck.message
          });
        }

        const integrityCheck = checkDataIntegrity(record, dataType);
        recordCheck.checks.integrity = integrityCheck;
        if (!integrityCheck.passed) {
          recordCheck.status = recordCheck.status === 'pass' ? 'warn' : recordCheck.status;
          recordCheck.issues.push(...integrityCheck.issues);
        }

        if (record.previousVersion) {
          const diffs = compareObjects(
            record.previousVersion.parsedData,
            record.parsedData
          );
          recordCheck.checks.resubmitDiff = {
            passed: true,
            differences: diffs,
            summary: getChangeSummary(diffs)
          };
        }

        typeResult.records.push(recordCheck);

        if (recordCheck.status === 'pass') typeResult.passed++;
        else if (recordCheck.status === 'fail') typeResult.failed++;
        else typeResult.warnings++;

        checkResults.summary.checkedRecords++;
      }

      checkResults.dataTypeResults[dataType] = typeResult;
      checkResults.summary.passed += typeResult.passed;
      checkResults.summary.failed += typeResult.failed;
      checkResults.summary.warnings += typeResult.warnings;
    }

    const crossCheckResults = performCrossChecks(allData, config);
    checkResults.crossChecks = crossCheckResults;
    checkResults.summary.issues.push(...crossCheckResults.issues);

    const riskItems = identifyRisks(allData, crossCheckResults);
    checkResults.riskItems = riskItems;

    for (const dataType of dataTypes) {
      const records = allData[dataType];
      for (const record of records) {
        record.checkStatus = 'checked';
        record.lastCheckId = checkId;
        record.lastCheckTime = checkTime;
      }
      const dataPath = path.join(paths.parsed, `${dataType}.json`);
      writeJson(dataPath, records);
    }

    state.lastCheck = {
      checkId,
      timestamp: checkTime,
      summary: checkResults.summary
    };
    writeState(root, state);

    const checkResultPath = path.join(paths.check, `check-${checkId}.json`);
    writeJson(checkResultPath, checkResults);

    const latestPath = path.join(paths.check, 'latest.json');
    writeJson(latestPath, checkResults);

    printCheckSummary(checkResults);

    console.log('');
    console.log(chalk.green('✅ 检查完成!'));
    console.log(`  检查ID: ${chalk.gray(checkId)}`);
    console.log(`  结果文件: ${chalk.gray(checkResultPath)}`);
    console.log('');
    console.log(chalk.cyan('下一步:'));
    console.log(`  ${chalk.white('kbase-audit report')} - 生成详细报告`);
    console.log(`  ${chalk.white('kbase-audit fix')} - 人工改判问题项`);
  });

function checkRecordStatus(record, dataType) {
  const issues = [];
  let message = '';

  if (record.status === 'imported' || record.status === 'resubmitted') {
    return { passed: true };
  }

  if (record.status === 'failed') {
    message = '记录导入失败';
    issues.push({ type: 'error', message });
    return { passed: false, message, issues };
  }

  if (record.status === 'duplicate_allowed') {
    issues.push({ type: 'warning', message: '重复记录（已允许导入）' });
    return { passed: true, issues };
  }

  return { passed: true };
}

function checkDataIntegrity(record, dataType) {
  const issues = [];
  const data = record.parsedData;

  const emptyFields = Object.entries(data).filter(([k, v]) => 
    v === null || v === undefined || v === ''
  );

  if (emptyFields.length > 0) {
    issues.push({
      type: 'warning',
      message: `存在空字段: ${emptyFields.map(e => e[0]).join(', ')}`,
      fields: emptyFields.map(e => e[0])
    });
  }

  if (data.created_at) {
    const date = new Date(data.created_at);
    if (isNaN(date.getTime())) {
      issues.push({
        type: 'error',
        message: '日期格式无效'
      });
    }
  }

  return {
    passed: issues.every(i => i.type !== 'error'),
    issues
  };
}

function performCrossChecks(allData, config) {
  const issues = [];
  const results = {};

  const changeOrders = allData.change_order || [];
  const reviewOpinions = allData.review_opinion || [];
  const citationRecords = allData.citation_record || [];
  const scanDetails = allData.scan_detail || [];

  results.reviewForChange = {
    checked: changeOrders.length,
    missingReview: 0,
    details: []
  };

  const reviewedChangeIds = new Set(reviewOpinions.map(r => r.parsedData.change_id));
  
  for (const co of changeOrders) {
    if (!reviewedChangeIds.has(co.recordId)) {
      results.reviewForChange.missingReview++;
      issues.push({
        type: 'warning',
        category: 'missing_review',
        recordId: co.recordId,
        rowNumber: co.rowNumber,
        sourceFile: co.source?.file,
        message: `变更单 ${co.recordId} 缺少审核意见`
      });
    }
  }

  results.offlineCitation = {
    checked: citationRecords.length,
    problematic: 0,
    details: []
  };

  const offlineAnswers = new Set(
    changeOrders
      .filter(co => co.parsedData.status === 'offline' || co.parsedData.status === '下线')
      .map(co => co.parsedData.answer_id)
  );

  for (const citation of citationRecords) {
    const answerId = citation.parsedData.answer_id;
    if (offlineAnswers.has(answerId)) {
      results.offlineCitation.problematic++;
      issues.push({
        type: 'error',
        category: 'offline_citation',
        recordId: citation.recordId,
        rowNumber: citation.rowNumber,
        sourceFile: citation.source?.file,
        answerId,
        message: `坐席复制了已下线答案 ${answerId}`
      });
    }
  }

  results.scanCoverage = {
    totalScans: scanDetails.length,
    withCitations: 0,
    withoutCitations: 0
  };

  const citedAnswers = new Set(citationRecords.map(c => c.parsedData.answer_id));
  for (const scan of scanDetails) {
    if (citedAnswers.has(scan.parsedData.answer_id)) {
      results.scanCoverage.withCitations++;
    } else {
      results.scanCoverage.withoutCitations++;
    }
  }

  return {
    ...results,
    issues,
    totalIssues: issues.length
  };
}

function identifyRisks(allData, crossChecks) {
  const risks = [];

  const offlineCitationIssues = crossChecks.issues?.filter(
    i => i.category === 'offline_citation'
  ) || [];

  if (offlineCitationIssues.length > 0) {
    const answerCounts = {};
    offlineCitationIssues.forEach(i => {
      answerCounts[i.answerId] = (answerCounts[i.answerId] || 0) + 1;
    });

    for (const [answerId, count] of Object.entries(answerCounts)) {
      if (count >= 3) {
        risks.push({
          level: 'high',
          type: 'repeated_offline_citation',
          answerId,
          count,
          message: `答案 ${answerId} 下线后仍被引用 ${count} 次，存在错赔风险`
        });
      }
    }
  }

  const changeOrders = allData.change_order || [];
  const pendingChanges = changeOrders.filter(
    co => co.parsedData.status === 'pending' || co.parsedData.status === '待审核'
  );

  if (pendingChanges.length > 5) {
    risks.push({
      level: 'medium',
      type: 'pending_backlog',
      count: pendingChanges.length,
      message: `存在 ${pendingChanges.length} 个待审核变更单积压`
    });
  }

  return risks;
}

function printCheckSummary(results) {
  console.log(chalk.cyan('📊 检查汇总:'));
  
  const summaryTable = new Table({
    head: [chalk.cyan('项目'), chalk.cyan('数量')],
    colWidths: [30, 15]
  });

  summaryTable.push(
    ['总记录数', results.summary.totalRecords],
    ['通过检查', chalk.green(results.summary.passed)],
    ['检查失败', chalk.red(results.summary.failed)],
    ['警告项', chalk.yellow(results.summary.warnings)],
    ['跨检查问题', results.crossChecks.totalIssues || 0],
    ['风险项', results.riskItems.length]
  );

  console.log(summaryTable.toString());
  console.log('');

  console.log(chalk.cyan('📋 分数据类型检查结果:'));
  for (const [dataType, typeResult] of Object.entries(results.dataTypeResults)) {
    console.log(`  ${chalk.white(typeResult.name)}:`);
    console.log(`    总计: ${typeResult.total}, 通过: ${chalk.green(typeResult.passed)}, 失败: ${chalk.red(typeResult.failed)}, 警告: ${chalk.yellow(typeResult.warnings)}`);
  }

  if (results.riskItems.length > 0) {
    console.log('');
    console.log(chalk.red('⚠️  高风险项:'));
    results.riskItems.slice(0, 5).forEach((risk, idx) => {
      const levelColor = risk.level === 'high' ? chalk.red : chalk.yellow;
      console.log(`  ${levelColor(`[${risk.level.toUpperCase()}]`)} ${risk.message}`);
    });
  }

  if (results.crossChecks.issues?.length > 0) {
    console.log('');
    console.log(chalk.yellow('❌ 发现的问题 (前10条):'));
    results.crossChecks.issues.slice(0, 10).forEach((issue, idx) => {
      const typeColor = issue.type === 'error' ? chalk.red : chalk.yellow;
      console.log(`  ${idx + 1}. ${typeColor(`[${issue.type}]`)} ${issue.message} (行 ${issue.rowNumber})`);
    });
  }
}

module.exports = checkCommand;
