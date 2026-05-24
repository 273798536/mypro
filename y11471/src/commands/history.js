const { getRecord, getChangeHistory, getSystemLogs, getRecordId, getRecordSources } = require('../recordService');
const { 
  printTable, printSuccess, printError, printInfo, printWarning, printDiff,
  truncateString
} = require('../utils');

async function historyCommand(action, batchNo, skuCode, options) {
  try {
    if (action === 'record' || action === 'r') {
      await showRecordHistory(batchNo, skuCode, options);
      return;
    }

    if (action === 'diff' || action === 'd') {
      await showDiffView(batchNo, skuCode, options);
      return;
    }

    if (action === 'logs' || action === 'l') {
      await showSystemLogs(options);
      return;
    }

    printError(`不支持的操作: ${action}`);
    console.log('\n支持的操作:');
    console.log('  record <批次号> <SKU>  - 查看单条记录的变更历史');
    console.log('  diff   <批次号> <SKU>  - 对比视图，按字段展示前后变化');
    console.log('  logs                  - 查看系统操作日志');
    process.exit(1);

  } catch (error) {
    printError(`查询失败: ${error.message}`);
    process.exit(1);
  }
}

async function showRecordHistory(batchNo, skuCode, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  printInfo(`变更历史: ${batchNo} / ${skuCode}`);

  const history = await getChangeHistory({ recordId, limit: options.limit || 50 });

  if (history.length === 0) {
    printWarning('没有变更记录');
    return;
  }

  const tableData = history.map(h => [
    h.id,
    h.field_name,
    truncateString(String(h.old_value || '-'), 20),
    truncateString(String(h.new_value || '-'), 20),
    h.changed_by || '-',
    truncateString(h.change_note || '-', 20),
    h.created_at ? new Date(h.created_at).toLocaleString('zh-CN') : '-'
  ]);

  printTable(
    ['ID', '字段', '原值', '新值', '操作人', '备注', '时间'],
    tableData
  );
}

async function showDiffView(batchNo, skuCode, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const sources = await getRecordSources(recordId);

  if (!sources) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const { record, history } = sources;

  printInfo(`变更对比视图: ${batchNo} / ${skuCode}`);
  console.log(`  商品: ${record.sku_name || '-'}`);
  console.log(`  当前状态: ${record.status || '-'}`);
  console.log();

  if (history.length === 0) {
    printWarning('没有变更记录');
    return;
  }

  const fieldChanges = {};
  history.forEach(h => {
    if (!fieldChanges[h.field_name]) {
      fieldChanges[h.field_name] = [];
    }
    fieldChanges[h.field_name].push(h);
  });

  console.log('【按字段分组的变更历史】');
  console.log('='.repeat(80));

  for (const [field, changes] of Object.entries(fieldChanges)) {
    console.log(`\n字段: ${field}`);
    console.log('-'.repeat(60));
    
    const sortedChanges = [...changes].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    for (let i = 0; i < sortedChanges.length; i++) {
      const change = sortedChanges[i];
      const prevValue = i === 0 ? change.old_value : sortedChanges[i - 1].new_value;
      
      console.log(`\n  变更 #${i + 1}`);
      printDiff(
        field,
        prevValue,
        change.new_value,
        `by ${change.changed_by || 'system'} - ${change.change_note || ''}`
      );
      console.log(`  时间: ${new Date(change.created_at).toLocaleString('zh-CN')}`);
    }

    console.log(`\n  当前值: ${record[field] ?? '-'}`);
  }

  console.log('\n' + '='.repeat(80));
}

async function showSystemLogs(options) {
  const logs = await getSystemLogs(options.limit || 100);

  if (logs.length === 0) {
    printWarning('没有系统日志');
    return;
  }

  printInfo('系统操作日志 (最近' + logs.length + '条)');

  const tableData = logs.map(l => [
    l.id,
    l.log_type,
    truncateString(l.action, 15),
    truncateString(l.related_record || '-', 20),
    truncateString(l.message || '-', 30),
    l.operator || '-',
    l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : '-'
  ]);

  printTable(
    ['ID', '类型', '动作', '关联记录', '消息', '操作人', '时间'],
    tableData
  );
}

module.exports = { historyCommand };
