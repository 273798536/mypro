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
  readState,
  writeState
} = require('../utils/file-manager');

const { DATA_TYPES, TYPE_CONFIG } = require('../utils/parser');

const {
  getCurrentUser,
  assertPermission,
  maskSensitiveData,
  filterSensitiveRecords,
  ROLES
} = require('../utils/auth');

const exportCommand = new Command('export')
  .description('导出巡检数据（导出前冻结）')
  .option('-f, --format <format>', '导出格式: json|csv|all', 'json')
  .option('-t, --type <type>', '指定数据类型导出')
  .option('--no-freeze', '不冻结项目（仅导出数据）')
  .option('--unfreeze', '解冻项目（允许继续修改）')
  .option('-o, --output <path>', '输出目录')
  .option('--include-source', '包含原始源文件')
  .action((options) => {
    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目'));
      process.exit(1);
    }

    const user = getCurrentUser(root);
    assertPermission('export', options, user);

    const state = readState(root);
    const paths = getWorkspacePaths(root);

    if (options.unfreeze) {
      unfreezeProject(root, state);
      return;
    }

    if (state.frozen) {
      console.log(chalk.yellow('⚠️  项目已处于冻结状态'));
    } else if (options.freeze !== false) {
      freezeProject(root, state);
    }

    console.log(chalk.cyan('📦 导出巡检数据...'));
    console.log('');

    const exportId = generateId();
    const exportTime = getTimestamp();
    const outputDir = options.output || path.join(paths.exports, exportId);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dataTypes = options.type 
      ? [options.type] 
      : Object.values(DATA_TYPES);

    const exportManifest = {
      exportId,
      exportTime,
      frozenAt: state.frozenAt || null,
      frozen: state.frozen,
      dataTypes: [],
      summary: {
        totalRecords: 0,
        byType: {}
      }
    };

    for (const dataType of dataTypes) {
      const dataPath = path.join(paths.parsed, `${dataType}.json`);
      const data = readJson(dataPath) || [];

      if (data.length === 0) continue;

      const typeConfig = TYPE_CONFIG[dataType];
      const filteredData = user.role === ROLES.READONLY 
        ? filterSensitiveRecords(data, user) 
        : data;
      const exportData = prepareExportData(filteredData, options.includeSource, user);

      exportManifest.dataTypes.push({
        type: dataType,
        name: typeConfig?.name || dataType,
        count: data.length,
        file: `${dataType}.${options.format === 'csv' ? 'csv' : 'json'}`
      });

      exportManifest.summary.totalRecords += data.length;
      exportManifest.summary.byType[dataType] = data.length;

      if (options.format === 'csv' || options.format === 'all') {
        exportAsCSV(exportData, path.join(outputDir, `${dataType}.csv`), dataType);
      }
      
      if (options.format === 'json' || options.format === 'all') {
        writeJson(path.join(outputDir, `${dataType}.json`), exportData);
      }
    }

    const latestCheck = readJson(path.join(paths.check, 'latest.json'));
    if (latestCheck) {
      writeJson(path.join(outputDir, 'check-result.json'), latestCheck);
    }

    const latestReport = fs.readdirSync(paths.reports)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()[0];

    if (latestReport) {
      const report = readJson(path.join(paths.reports, latestReport));
      writeJson(path.join(outputDir, 'report.json'), report);
    }

    writeJson(path.join(outputDir, 'MANIFEST.json'), exportManifest);

    printExportSummary(exportManifest, outputDir);

    state.lastExport = {
      exportId,
      timestamp: exportTime,
      outputDir
    };
    writeState(root, state);

    const historyPath = path.join(paths.history, `export-${exportId}.json`);
    writeJson(historyPath, {
      action: 'export',
      exportId,
      timestamp: exportTime,
      frozen: state.frozen,
      manifest: exportManifest
    });

    console.log('');
    console.log(chalk.green('✅ 导出完成!'));
    console.log(`  导出ID: ${chalk.gray(exportId)}`);
    console.log(`  输出目录: ${chalk.gray(outputDir)}`);
    console.log('');

    if (state.frozen) {
      console.log(chalk.yellow('⚠️  项目已冻结，如需继续修改请执行:'));
      console.log(`  ${chalk.white('kbase-audit export --unfreeze')}`);
    }
  });

function freezeProject(root, state) {
  state.frozen = true;
  state.frozenAt = getTimestamp();
  state.frozenBy = 'user-via-cli';
  writeState(root, state);

  console.log(chalk.cyan('❄️  项目已冻结'));
  console.log(`  冻结时间: ${chalk.white(state.frozenAt)}`);
  console.log(chalk.gray('  冻结后将禁止导入新数据，确保导出数据一致性'));
  console.log('');
}

function unfreezeProject(root, state) {
  if (!state.frozen) {
    console.log(chalk.green('✅ 项目未冻结'));
    return;
  }

  state.frozen = false;
  state.unfrozenAt = getTimestamp();
  writeState(root, state);

  console.log(chalk.green('✅ 项目已解冻'));
  console.log(`  解冻时间: ${chalk.white(state.unfrozenAt)}`);
  console.log(chalk.gray('  现在可以继续导入和修改数据'));
}

function prepareExportData(records, includeSource, user) {
  return records.map(record => {
    const exported = {
      recordId: record.recordId,
      dataType: record.dataType,
      importId: record.importId,
      batchId: record.batchId,
      rowNumber: record.rowNumber,
      sourceFile: record.source?.file,
      sourceRow: record.source?.rowNumber,
      parsedData: record.parsedData,
      status: record.status,
      checkStatus: record.checkStatus,
      manualOverride: record.manualOverride || false,
      overrideStatus: record.overrideStatus || null,
      overrideReason: record.overrideReason || null,
      overrideTime: record.overrideTime || null,
      isResubmit: record.isResubmit || false,
      previousVersion: record.previousVersion ? {
        recordId: record.previousVersion.recordId,
        withdrawnAt: record.previousVersion.withdrawnAt,
        parsedData: record.previousVersion.parsedData
      } : null
    };

    if (includeSource) {
      exported.rawData = record.rawData;
      exported.source = record.source;
      exported.overrideHistory = record.overrideHistory;
    }

    return exported;
  });
}

function exportAsCSV(data, outputPath, dataType) {
  try {
    const flatData = data.map(item => ({
      recordId: item.recordId,
      dataType: item.dataType,
      batchId: item.batchId,
      rowNumber: item.rowNumber,
      sourceFile: item.sourceFile,
      sourceRow: item.sourceRow,
      status: item.status,
      checkStatus: item.checkStatus,
      manualOverride: item.manualOverride,
      overrideStatus: item.overrideStatus,
      overrideReason: item.overrideReason,
      ...flattenObject(item.parsedData, 'data')
    }));

    if (flatData.length > 0) {
      const fields = Object.keys(flatData[0]);
      const parser = new Parser({ fields });
      const csv = parser.parse(flatData);
      fs.writeFileSync(outputPath, '\ufeff' + csv, 'utf8');
    } else {
      fs.writeFileSync(outputPath, '', 'utf8');
    }
  } catch (e) {
    console.log(chalk.yellow(`⚠️  CSV 导出失败 (${dataType}): ${e.message}`));
  }
}

function flattenObject(obj, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

function printExportSummary(manifest, outputDir) {
  console.log(chalk.cyan('📊 导出汇总:'));
  
  const summaryTable = new Table({
    head: [chalk.cyan('数据类型'), chalk.cyan('记录数')],
    colWidths: [25, 15]
  });

  for (const dt of manifest.dataTypes) {
    summaryTable.push([dt.name, chalk.white(dt.count)]);
  }
  summaryTable.push([chalk.cyan('总计'), chalk.cyan(manifest.summary.totalRecords)]);

  console.log(summaryTable.toString());
  console.log('');

  console.log(chalk.cyan('📁 导出文件:'));
  const files = fs.readdirSync(outputDir);
  for (const file of files.sort()) {
    const stats = fs.statSync(path.join(outputDir, file));
    const size = (stats.size / 1024).toFixed(1) + ' KB';
    console.log(`  ${chalk.gray('-')} ${file} ${chalk.gray(`(${size})`)}`);
  }
}

module.exports = exportCommand;
