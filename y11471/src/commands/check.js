const { listRecords, getImportFailures, getImportBatches, getRecordSources } = require('../recordService');
const { 
  printTable, printSuccess, printError, printWarning, printInfo,
  getStatusColor, getDataQualityLevel, truncateString 
} = require('../utils');

function validateRecord(record) {
  const issues = [];
  
  if (!record.apply_qty || record.apply_qty <= 0) {
    issues.push({ level: 'error', message: '缺少退供申请数量' });
  }
  
  if (!record.inspection_qty || record.inspection_qty <= 0) {
    issues.push({ level: 'warning', message: '缺少质检数量' });
  }
  
  if (!record.shipped_qty || record.shipped_qty <= 0) {
    issues.push({ level: 'warning', message: '缺少发货数量' });
  }
  
  if (!record.received_qty || record.received_qty <= 0) {
    issues.push({ level: 'warning', message: '缺少实收数量' });
  }
  
  if (record.apply_qty > 0 && record.shipped_qty > record.apply_qty) {
    issues.push({ level: 'error', message: `发货数量(${record.shipped_qty})大于申请数量(${record.apply_qty})` });
  }
  
  if (record.shipped_qty > 0 && record.received_qty > record.shipped_qty) {
    issues.push({ level: 'warning', message: `实收数量(${record.received_qty})大于发货数量(${record.shipped_qty})` });
  }
  
  if (record.supplier_accepted_qty > record.apply_qty) {
    issues.push({ level: 'error', message: `供应商确认数量(${record.supplier_accepted_qty})大于申请数量(${record.apply_qty})` });
  }
  
  return issues;
}

async function checkCommand(options) {
  try {
    if (options.failures) {
      await showImportFailures(options.batch);
      return;
    }

    if (options.batches) {
      await showImportBatches();
      return;
    }

    const filters = {};
    if (options.batch) filters.batchNo = options.batch;
    if (options.sku) filters.skuCode = options.sku;

    const records = await listRecords(filters);
    
    if (records.length === 0) {
      printWarning('没有找到记录');
      return;
    }

    let errorCount = 0;
    let warningCount = 0;
    const recordIssues = [];

    records.forEach(record => {
      const issues = validateRecord(record);
      const errors = issues.filter(i => i.level === 'error');
      const warnings = issues.filter(i => i.level === 'warning');
      
      errorCount += errors.length;
      warningCount += warnings.length;
      
      if (issues.length > 0) {
        recordIssues.push({
          record,
          issues,
          errorCount: errors.length,
          warningCount: warnings.length
        });
      }
    });

    printInfo(`数据校验完成，共检查 ${records.length} 条记录`);
    console.log(`  错误: ${errorCount} 个`);
    console.log(`  警告: ${warningCount} 个`);

    if (options.detail && recordIssues.length > 0) {
      console.log('\n问题详情:');
      recordIssues.forEach(({ record, issues }) => {
        console.log(`\n  ${record.batch_no} / ${record.sku_code}`);
        issues.forEach(issue => {
          const color = issue.level === 'error' ? '\x1b[31m' : '\x1b[33m';
          console.log(`    ${color}●\x1b[0m ${issue.message}`);
        });
      });
    } else if (recordIssues.length > 0) {
      const tableData = recordIssues.slice(0, 20).map(({ record, errorCount, warningCount }) => [
        record.batch_no,
        record.sku_code,
        truncateString(record.sku_name || '-', 20),
        errorCount,
        warningCount
      ]);
      
      console.log('\n有问题的记录:');
      printTable(
        ['批次号', 'SKU', '商品名称', '错误', '警告'],
        tableData
      );
      
      if (recordIssues.length > 20) {
        console.log(`... 还有 ${recordIssues.length - 20} 条有问题的记录，使用 --detail 查看详情`);
      }
    } else {
      printSuccess('所有记录数据校验通过!');
    }

  } catch (error) {
    printError(`校验失败: ${error.message}`);
    process.exit(1);
  }
}

async function showImportFailures(batchId = null) {
  const failures = await getImportFailures(batchId);
  
  if (failures.length === 0) {
    printSuccess('没有导入失败的记录');
    return;
  }

  printWarning(`共 ${failures.length} 条导入失败记录:`);
  
  const tableData = failures.slice(0, 30).map(f => [
    f.batch_id.slice(-8),
    f.source_type,
    f.original_line_no || '-',
    truncateString(f.error_reason, 50)
  ]);
  
  printTable(
    ['批次ID', '类型', '行号', '错误原因'],
    tableData
  );
  
  if (failures.length > 30) {
    console.log(`... 还有 ${failures.length - 30} 条失败记录`);
  }
}

async function showImportBatches() {
  const batches = await getImportBatches();
  
  if (batches.length === 0) {
    printInfo('还没有导入批次');
    return;
  }

  const tableData = batches.slice(0, 20).map(b => [
    b.id,
    b.source_type,
    b.source_file,
    b.success_count,
    b.fail_count,
    b.created_at ? new Date(b.created_at).toLocaleString('zh-CN') : '-'
  ]);
  
  console.log('导入批次历史:');
  printTable(
    ['批次ID', '类型', '源文件', '成功', '失败', '导入时间'],
    tableData
  );
}

module.exports = { checkCommand, validateRecord };
