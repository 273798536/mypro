const { Command } = require('commander');
const fs = require('fs');
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
  writeState,
  ensureDir
} = require('../utils/file-manager');

const {
  compareObjects,
  createSnapshot
} = require('../utils/diff-utils');

const {
  DATA_TYPES,
  TYPE_CONFIG,
  detectDataType,
  parseCSV,
  parseJSON,
  validateRecord
} = require('../utils/parser');

const {
  getCurrentUser,
  assertPermission,
  filterSensitiveRecords,
  ROLES
} = require('../utils/auth');

const {
  addToRetryQueue,
  getFailedImportItems
} = require('../utils/queue-manager');

const importCommand = new Command('import')
  .description('导入数据文件')
  .argument('<file>', '要导入的文件路径')
  .option('-t, --type <type>', '数据类型: change_order|review_opinion|citation_record|scan_detail', '')
  .option('-b, --batch <batchId>', '批次ID（用于关联导入）', '')
  .option('--allow-duplicate', '允许重复记录')
  .option('--allow-partial', '允许部分导入（跳过错误行）')
  .option('--resubmit', '撤回后重新提交模式')
  .option('--append', '追加模式（不覆盖现有数据）', true)
  .action(async (file, options) => {
    const root = getWorkspaceRoot();
    if (!root) {
      console.log(chalk.red('❌ 未找到巡检项目，请先在项目目录下操作'));
      process.exit(1);
    }

    const user = getCurrentUser(root);
    assertPermission('import', options, user);

    const state = readState(root);
    if (state.frozen) {
      console.log(chalk.red('❌ 项目已冻结，禁止导入新数据'));
      process.exit(1);
    }

    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.red(`❌ 文件不存在: ${filePath}`));
      process.exit(1);
    }

    const paths = getWorkspacePaths(root);
    const config = readJson(paths.config);
    const ext = path.extname(filePath).toLowerCase();

    let parseResult;
    try {
      if (ext === '.csv') {
        parseResult = await parseCSV(filePath);
      } else if (ext === '.json') {
        parseResult = parseJSON(filePath);
      } else {
        console.log(chalk.red('❌ 不支持的文件格式，仅支持 .csv 和 .json'));
        process.exit(1);
      }
    } catch (e) {
      console.log(chalk.red(`❌ 解析文件失败: ${e.message}`));
      process.exit(1);
    }

    let dataType = options.type;
    if (!dataType) {
      dataType = detectDataType(parseResult.headers);
      if (!dataType) {
        console.log(chalk.yellow('⚠️  无法自动检测数据类型，请使用 --type 参数指定'));
        console.log(chalk.gray('支持的类型: change_order, review_opinion, citation_record, scan_detail'));
        process.exit(1);
      }
    }

    if (!DATA_TYPES[dataType.toUpperCase()] && !Object.values(DATA_TYPES).includes(dataType)) {
      console.log(chalk.red(`❌ 无效的数据类型: ${dataType}`));
      process.exit(1);
    }

    dataType = Object.values(DATA_TYPES).find(t => t === dataType) || dataType;
    const typeConfig = TYPE_CONFIG[dataType];

    console.log(chalk.cyan(`📥 导入数据类型: ${typeConfig.name}`));
    console.log(chalk.gray(`文件: ${filePath}`));
    console.log('');

    const existingDataPath = path.join(paths.parsed, `${dataType}.json`);
    const existingData = readJson(existingDataPath) || [];
    const existingIds = new Set(existingData.map(r => r.recordId));

    const batchId = options.batch || generateId();
    const importId = generateId();
    const importTime = getTimestamp();

    const importResults = {
      importId,
      batchId,
      dataType,
      sourceFile: path.basename(filePath),
      sourcePath: filePath,
      timestamp: importTime,
      mode: options.resubmit ? 'resubmit' : (options.append ? 'append' : 'replace'),
      total: parseResult.totalRows,
      success: 0,
      failed: 0,
      skipped: 0,
      duplicate: 0,
      records: [],
      errors: [],
      changes: []
    };

    for (const record of parseResult.records) {
      const validation = validateRecord(record, dataType);
      const recordId = validation.recordId || `${dataType}-${record.rowNumber}`;

      if (!validation.valid) {
        const errorMsg = validation.errors.join('; ');
        if (options.allowPartial) {
          importResults.failed++;
          importResults.errors.push({
            rowNumber: record.rowNumber,
            recordId,
            errors: validation.errors,
            rawData: record.rawData
          });

          const queueItem = addToRetryQueue(root, {
            originalData: record,
            action: 'import',
            dataType: dataType,
            sourceFile: record.source?.file,
            rowNumber: record.rowNumber,
            error: errorMsg,
            parsedData: record.parsedData,
            rawData: record.rawData,
            source: record.source,
            recordId: recordId,
            sourcePath: filePath
          }, {
            metadata: {
              importId,
              batchId,
              validationErrors: validation.errors
            }
          });
          importResults.enqueuedForRetry = importResults.enqueuedForRetry || 0;
          importResults.enqueuedForRetry++;
          importResults.queueItemIds = importResults.queueItemIds || [];
          importResults.queueItemIds.push(queueItem.id);
          continue;
        } else {
          console.log(chalk.red(`❌ 第 ${record.rowNumber} 行验证失败:`));
          validation.errors.forEach(e => console.log(`   - ${e}`));
          console.log(chalk.gray('使用 --allow-partial 允许部分导入，失败项将进入重试队列'));
          process.exit(1);
        }
      }

      const isDuplicate = existingIds.has(recordId);
      if (isDuplicate && !options.allowDuplicate) {
        importResults.duplicate++;
        importResults.skipped++;
        
        const existingRecord = existingData.find(r => r.recordId === recordId);
        const differences = compareObjects(existingRecord?.parsedData, record.parsedData);
        
        if (differences.length > 0) {
          importResults.changes.push({
            recordId,
            rowNumber: record.rowNumber,
            differences,
            oldData: existingRecord?.parsedData,
            newData: record.parsedData
          });
        }
        continue;
      }

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
        status: isDuplicate ? 'duplicate' : 'imported',
        isResubmit: options.resubmit,
        manualOverride: false,
        checkStatus: 'pending'
      };

      if (options.resubmit) {
        importRecord.status = 'resubmitted';
        const existingIndex = existingData.findIndex(r => r.recordId === recordId);
        if (existingIndex >= 0) {
          importRecord.previousVersion = {
            ...existingData[existingIndex],
            withdrawnAt: importTime
          };
          existingData[existingIndex] = importRecord;
        } else {
          existingData.push(importRecord);
        }
      } else if (isDuplicate && options.allowDuplicate) {
        importRecord.status = 'duplicate_allowed';
        existingData.push(importRecord);
        importResults.success++;
      } else {
        existingData.push(importRecord);
        importResults.success++;
      }

      if (!isDuplicate || options.allowDuplicate) {
        importResults.records.push(importRecord);
      }
    }

    importResults.errors.push(...parseResult.errors.map(e => ({
      rowNumber: e.rowNumber,
      errors: [e.error],
      rawData: e.rawData,
      parseError: true
    })));
    importResults.failed += parseResult.errors.length;

    writeJson(existingDataPath, existingData);

    const sourceBackupPath = path.join(paths.source, `${dataType}-${importId}${ext}`);
    fs.copyFileSync(filePath, sourceBackupPath);

    state.importStats[dataType].total += importResults.total;
    state.importStats[dataType].valid += importResults.success;
    state.importStats[dataType].invalid += importResults.failed;

    if (!state.batches.includes(batchId)) {
      state.batches.push(batchId);
    }
    state.currentBatch = batchId;

    writeState(root, state);

    const historyEntry = {
      action: 'import',
      importId,
      batchId,
      dataType,
      timestamp: importTime,
      snapshotBefore: createSnapshot(existingData.slice(0, -importResults.success)),
      snapshotAfter: createSnapshot(existingData),
      summary: {
        total: importResults.total,
        success: importResults.success,
        failed: importResults.failed,
        skipped: importResults.skipped,
        duplicate: importResults.duplicate,
        enqueuedForRetry: importResults.enqueuedForRetry || 0,
        queueItemIds: importResults.queueItemIds || []
      }
    };

    const historyPath = path.join(paths.history, `import-${importId}.json`);
    writeJson(historyPath, historyEntry);

    const table = new Table({
      head: [chalk.cyan('统计项'), chalk.cyan('数量')],
      colWidths: [30, 15]
    });

    table.push(
      ['总行数', importResults.total],
      ['成功导入', chalk.green(importResults.success)],
      ['验证失败', chalk.red(importResults.failed)],
      ['跳过重复', chalk.yellow(importResults.duplicate)]
    );

    if (importResults.enqueuedForRetry > 0) {
      table.push(
        ['进入重试队列', chalk.cyan(importResults.enqueuedForRetry)]
      );
    }

    console.log(table.toString());
    console.log('');

    if (importResults.errors.length > 0) {
      console.log(chalk.red('❌ 错误记录:'));
      importResults.errors.slice(0, 5).forEach(err => {
        console.log(`  行 ${err.rowNumber}: ${err.errors?.join(', ') || err.error}`);
      });
      if (importResults.errors.length > 5) {
        console.log(chalk.gray(`  ... 还有 ${importResults.errors.length - 5} 条错误`));
      }
      console.log('');
      console.log(chalk.cyan('🔄 重试队列:'));
      console.log(`  ${importResults.enqueuedForRetry} 条记录已进入重试队列`);
      console.log(`  查看队列: ${chalk.white('kbase-audit queue status')}`);
      console.log(`  执行重试: ${chalk.white('kbase-audit queue retry')}`);
      console.log('');
    }

    if (importResults.changes.length > 0) {
      console.log(chalk.yellow('⚠️  数据变更记录 (重复提交但内容不同):'));
      importResults.changes.slice(0, 3).forEach(change => {
        console.log(`  ${change.recordId} (行 ${change.rowNumber}): ${change.differences.length} 处变更`);
      });
      if (importResults.changes.length > 3) {
        console.log(chalk.gray(`  ... 还有 ${importResults.changes.length - 3} 条变更记录`));
      }
      console.log('');
    }

    console.log(chalk.green('✅ 导入完成!'));
    console.log(`  导入ID: ${chalk.gray(importId)}`);
    console.log(`  批次ID: ${chalk.gray(batchId)}`);
    console.log(`  源文件备份: ${chalk.gray(sourceBackupPath)}`);
    console.log('');
    console.log(chalk.cyan('下一步:'));
    console.log(`  ${chalk.white('kbase-audit check')}`);
  });

module.exports = importCommand;
