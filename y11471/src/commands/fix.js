const { getRecord, updateRecord, makeJudgment, getRecordSources, getRecordId } = require('../recordService');
const { 
  printTable, printSuccess, printError, printWarning, printInfo, printDiff,
  getStatusColor, safeParseInt 
} = require('../utils');

async function fixCommand(action, batchNo, skuCode, value, options) {
  try {
    if (action === 'show' || action === 'detail') {
      await showRecordDetail(batchNo, skuCode);
      return;
    }

    if (action === 'accept') {
      await acceptBatch(batchNo, skuCode, value, options);
      return;
    }

    if (action === 'reject') {
      await rejectBatch(batchNo, skuCode, value, options);
      return;
    }

    if (action === 'pending') {
      await pendingBatch(batchNo, skuCode, value, options);
      return;
    }

    if (action === 'status') {
      await updateStatus(batchNo, skuCode, value, options);
      return;
    }

    if (action === 'judgment') {
      await updateJudgment(batchNo, skuCode, value, options);
      return;
    }

    if (action === 'field') {
      await updateField(batchNo, skuCode, options.field, value, options);
      return;
    }

    printError(`不支持的操作: ${action}`);
    console.log('\n支持的操作:');
    console.log('  show <批次号> <SKU>       - 显示记录详情');
    console.log('  accept <批次号> <SKU> <数量> - 供应商确认数量');
    console.log('  reject <批次号> <SKU> <数量> - 供应商拒收数量');
    console.log('  pending <批次号> <SKU> <数量> - 供应商待确认数量');
    console.log('  status <批次号> <SKU> <状态>  - 更新状态');
    console.log('  judgment <批次号> <SKU> <判定> - 更新判定结果');
    console.log('  field <批次号> <SKU> --field <字段名> <值> - 更新字段值');
    process.exit(1);

  } catch (error) {
    printError(`操作失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

async function showRecordDetail(batchNo, skuCode) {
  const recordId = getRecordId(batchNo, skuCode);
  const sources = await getRecordSources(recordId);

  if (!sources) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const { record, applications, inspections, logistics, sms, exceptions, history, judgments } = sources;

  console.log('\n' + '='.repeat(80));
  console.log(`记录详情: ${batchNo} / ${skuCode}`);
  console.log('='.repeat(80));

  console.log('\n【基本信息】');
  console.log(`  商品名称: ${record.sku_name || '-'}`);
  console.log(`  供应商: ${record.supplier_name || '-'} (${record.supplier_code || '-'})`);
  console.log(`  仓库: ${record.warehouse_code || '-'}`);
  console.log(`  状态: ${getStatusColor(record.status)(record.status)}`);
  console.log(`  判定: ${record.judgment || '-'}`);
  console.log(`  备注: ${record.judgment_note || '-'}`);

  console.log('\n【数量汇总】');
  console.log(`  申请数量: ${record.apply_qty || 0}`);
  console.log(`  质检数量: ${record.inspection_qty || 0}`);
  console.log(`  发货数量: ${record.shipped_qty || 0}`);
  console.log(`  实收数量: ${record.received_qty || 0}`);
  console.log(`  异常数量: ${record.exception_qty || 0}`);
  console.log(`  短信确认: ${record.sms_confirmed_qty || 0}`);
  console.log(`  供应商确认: ${record.supplier_accepted_qty || 0}`);
  console.log(`  供应商拒收: ${record.supplier_rejected_qty || 0}`);
  console.log(`  供应商待确认: ${record.supplier_pending_qty || 0}`);
  console.log(`  最终数量: ${record.final_qty || 0}`);

  if (applications.length > 0) {
    console.log('\n【退供申请来源】');
    printTable(
      ['原始行号', '申请数量', '申请日期', '原因', '源文件'],
      applications.map(a => [
        a.original_line_no || '-',
        a.apply_qty,
        a.apply_date || '-',
        a.reason || '-',
        a.source_file.split('/').pop()
      ])
    );
  }

  if (inspections.length > 0) {
    console.log('\n【质检照片来源】');
    printTable(
      ['照片名称', '质检结果', '质检数量', '质检员', '日期'],
      inspections.map(i => [
        i.photo_name,
        i.inspection_result || '-',
        i.inspection_qty || 0,
        i.inspector || '-',
        i.inspection_date || '-'
      ])
    );
  }

  if (logistics.length > 0) {
    console.log('\n【物流回单来源】');
    printTable(
      ['运单号', '发货数量', '实收数量', '承运商', '发货日期'],
      logistics.map(l => [
        l.tracking_no || '-',
        l.shipped_qty || 0,
        l.received_qty || 0,
        l.carrier || '-',
        l.shipping_date || '-'
      ])
    );
  }

  if (sms.length > 0) {
    console.log('\n【短信截图来源】');
    printTable(
      ['发送方', '接收方', '确认数量', '发送时间'],
      sms.map(s => [
        s.sender || '-',
        s.receiver || '-',
        s.confirmed_qty || 0,
        s.send_time || '-'
      ])
    );
  }

  if (exceptions.length > 0) {
    console.log('\n【异常照片来源】');
    printTable(
      ['照片名称', '异常类型', '异常数量', '上报人', '日期'],
      exceptions.map(e => [
        e.photo_name,
        e.exception_type || '-',
        e.exception_qty || 0,
        e.reporter || '-',
        e.report_date || '-'
      ])
    );
  }

  if (judgments.length > 0) {
    console.log('\n【判定历史】');
    printTable(
      ['判定类型', '原值', '新值', '备注', '判定人', '时间'],
      judgments.map(j => [
        j.judgment_type,
        j.old_value,
        j.new_value,
        j.judge_note || '-',
        j.judged_by || '-',
        j.created_at ? new Date(j.created_at).toLocaleString('zh-CN') : '-'
      ])
    );
  }

  if (history.length > 0) {
    console.log('\n【变更历史 (最近5条)】');
    printTable(
      ['字段', '原值', '新值', '操作人', '备注', '时间'],
      history.slice(0, 5).map(h => [
        h.field_name,
        h.old_value,
        h.new_value,
        h.changed_by || '-',
        h.change_note || '-',
        h.created_at ? new Date(h.created_at).toLocaleString('zh-CN') : '-'
      ])
    );
  }
}

async function acceptBatch(batchNo, skuCode, qty, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const qtyValue = safeParseInt(qty, null);
  if (qtyValue === null || qtyValue < 0) {
    printError('数量必须是非负整数');
    process.exit(1);
  }

  console.log('\n修改前:');
  printDiff('供应商确认数量', record.supplier_accepted_qty, qtyValue);

  const result = await makeJudgment(
    recordId,
    'supplier_accepted_qty',
    qtyValue,
    options.note || '供应商确认',
    options.operator || 'system'
  );

  if (result.updated) {
    printSuccess('供应商确认数量已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

async function rejectBatch(batchNo, skuCode, qty, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const qtyValue = safeParseInt(qty, null);
  if (qtyValue === null || qtyValue < 0) {
    printError('数量必须是非负整数');
    process.exit(1);
  }

  console.log('\n修改前:');
  printDiff('供应商拒收数量', record.supplier_rejected_qty, qtyValue);

  const result = await makeJudgment(
    recordId,
    'supplier_rejected_qty',
    qtyValue,
    options.note || '供应商拒收',
    options.operator || 'system'
  );

  if (result.updated) {
    printSuccess('供应商拒收数量已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

async function pendingBatch(batchNo, skuCode, qty, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const qtyValue = safeParseInt(qty, null);
  if (qtyValue === null || qtyValue < 0) {
    printError('数量必须是非负整数');
    process.exit(1);
  }

  console.log('\n修改前:');
  printDiff('供应商待确认数量', record.supplier_pending_qty, qtyValue);

  const result = await makeJudgment(
    recordId,
    'supplier_pending_qty',
    qtyValue,
    options.note || '供应商待确认',
    options.operator || 'system'
  );

  if (result.updated) {
    printSuccess('供应商待确认数量已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

async function updateStatus(batchNo, skuCode, status, options) {
  const validStatuses = ['pending', 'confirmed', 'rejected', 'partial', 'reviewing', 'completed'];
  if (!validStatuses.includes(status)) {
    printError(`无效状态: ${status}`);
    console.log('有效状态: ' + validStatuses.join(', '));
    process.exit(1);
  }

  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  console.log('\n修改前:');
  printDiff('状态', record.status, status);

  const result = await updateRecord(
    recordId,
    { status },
    options.operator || 'system',
    options.note || '更新状态'
  );

  if (result.updated) {
    printSuccess('状态已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

async function updateJudgment(batchNo, skuCode, judgment, options) {
  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  console.log('\n修改前:');
  printDiff('判定', record.judgment, judgment);

  const result = await updateRecord(
    recordId,
    { judgment, judgment_note: options.note },
    options.operator || 'system',
    options.note || '更新判定'
  );

  if (result.updated) {
    printSuccess('判定已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

async function updateField(batchNo, skuCode, field, value, options) {
  if (!field) {
    printError('请指定字段名: --field <字段名>');
    process.exit(1);
  }

  const recordId = getRecordId(batchNo, skuCode);
  const record = await getRecord(recordId);

  if (!record) {
    printError(`记录不存在: ${batchNo} / ${skuCode}`);
    process.exit(1);
  }

  const allowedFields = [
    'sku_name', 'supplier_code', 'supplier_name', 'warehouse_code',
    'apply_qty', 'inspection_qty', 'shipped_qty', 'received_qty',
    'exception_qty', 'sms_confirmed_qty', 'status', 'judgment', 'judgment_note'
  ];

  if (!allowedFields.includes(field)) {
    printError(`不允许修改的字段: ${field}`);
    console.log('允许的字段: ' + allowedFields.join(', '));
    process.exit(1);
  }

  const numFields = ['apply_qty', 'inspection_qty', 'shipped_qty', 'received_qty', 'exception_qty', 'sms_confirmed_qty'];
  let finalValue = value;
  if (numFields.includes(field)) {
    finalValue = safeParseInt(value, 0);
  }

  console.log('\n修改前:');
  printDiff(field, record[field], finalValue);

  const result = await updateRecord(
    recordId,
    { [field]: finalValue },
    options.operator || 'system',
    options.note || `更新字段: ${field}`
  );

  if (result.updated) {
    printSuccess('字段已更新');
    console.log('\n变更记录:');
    result.changes.forEach(c => printDiff(c.field, c.oldValue, c.newValue));
  } else {
    printInfo('没有变更');
  }
}

module.exports = { fixCommand, showRecordDetail };
