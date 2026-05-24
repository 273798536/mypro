const { listRecords, getRecordsByBatch, getRecordsByStatus, getRecordsBySupplier } = require('../recordService');
const { 
  printTable, printSuccess, printError, printInfo, printWarning,
  getStatusColor, calculateSummaryStats, truncateString, getDataQualityLevel
} = require('../utils');

async function reportCommand(view, options) {
  try {
    if (view === 'summary' || !view) {
      await showSummaryReport(options);
    } else if (view === 'by-batch') {
      await showByBatchReport(options);
    } else if (view === 'by-status') {
      await showByStatusReport(options);
    } else if (view === 'by-supplier') {
      await showBySupplierReport(options);
    } else {
      printError(`不支持的报表视图: ${view}`);
      console.log('\n支持的视图:');
      console.log('  summary       - 汇总报表 (默认)');
      console.log('  by-batch      - 按批次分组');
      console.log('  by-status     - 按状态分组');
      console.log('  by-supplier   - 按供应商分组');
      process.exit(1);
    }
  } catch (error) {
    printError(`生成报表失败: ${error.message}`);
    process.exit(1);
  }
}

async function showSummaryReport(options) {
  const filters = {};
  if (options.batch) filters.batchNo = options.batch;
  if (options.sku) filters.skuCode = options.sku;
  if (options.supplier) filters.supplierCode = options.supplier;
  if (options.status) filters.status = options.status;

  const records = await listRecords(filters);
  
  if (records.length === 0) {
    printWarning('没有数据');
    return;
  }

  const stats = calculateSummaryStats(records);

  console.log('\n' + '='.repeat(80));
  console.log('【仓库退供复核 - 汇总报表】');
  console.log('='.repeat(80));

  const batches = new Set(records.map(r => r.batch_no));
  const skus = new Set(records.map(r => r.sku_code));
  const suppliers = new Set(records.map(r => r.supplier_name || r.supplier_code));

  console.log('\n【基本统计】');
  console.log(`  记录总数: ${stats.totalRecords}`);
  console.log(`  涉及批次: ${batches.size}`);
  console.log(`  涉及SKU: ${skus.size}`);
  console.log(`  涉及供应商: ${suppliers.size}`);

  console.log('\n【数量汇总】');
  console.log(`  申请总数: ${stats.totalApplyQty}`);
  console.log(`  质检总数: ${stats.totalInspectionQty}`);
  console.log(`  发货总数: ${stats.totalShippedQty}`);
  console.log(`  实收总数: ${stats.totalReceivedQty}`);
  console.log(`  异常总数: ${stats.totalExceptionQty}`);
  console.log(`  短信确认总数: ${stats.totalSmsConfirmedQty}`);
  console.log(`  供应商确认总数: ${stats.totalSupplierAcceptedQty}`);
  console.log(`  供应商拒收总数: ${stats.totalSupplierRejectedQty}`);
  console.log(`  供应商待确认总数: ${stats.totalSupplierPendingQty}`);
  console.log(`  最终总数: ${stats.totalSupplierAcceptedQty}`);

  console.log('\n【状态分布】');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    const s = status || '未设置';
    console.log(`  ${getStatusColor(status)(s)}: ${count} 条`);
  });

  console.log('\n【数据质量】');
  console.log(`  平均质量得分: ${stats.avgDataQuality}/100`);
  const { text, color } = getDataQualityLevel(stats.avgDataQuality);
  console.log(`  质量等级: ${color(text)}`);

  if (options.detail) {
    console.log('\n【明细列表】');
    const tableData = records.map(r => [
      r.batch_no,
      r.sku_code,
      truncateString(r.sku_name || '-', 15),
      r.apply_qty || 0,
      r.received_qty || 0,
      r.supplier_accepted_qty || 0,
      r.supplier_rejected_qty || 0,
      getStatusColor(r.status)(r.status || '-')
    ]);
    printTable(
      ['批次号', 'SKU', '商品名称', '申请', '实收', '确认', '拒收', '状态'],
      tableData
    );
  }

  console.log('\n' + '='.repeat(80));
}

async function showByBatchReport(options) {
  const records = await listRecords({});
  const batchData = {};

  records.forEach(r => {
    const batchNo = r.batch_no || '未知';
    if (!batchData[batchNo]) {
      batchData[batchNo] = {
        records: 0,
        skus: new Set(),
        apply: 0,
        received: 0,
        accepted: 0,
        rejected: 0,
        pending: 0
      };
    }
    batchData[batchNo].records++;
    batchData[batchNo].skus.add(r.sku_code);
    batchData[batchNo].apply += r.apply_qty || 0;
    batchData[batchNo].received += r.received_qty || 0;
    batchData[batchNo].accepted += r.supplier_accepted_qty || 0;
    batchData[batchNo].rejected += r.supplier_rejected_qty || 0;
    batchData[batchNo].pending += r.supplier_pending_qty || 0;
  });

  console.log('\n【按批次分组报表】');
  const tableData = Object.entries(batchData)
    .slice(0, options.limit || 30)
    .map(([batch, data]) => [
      batch,
      data.records,
      data.skus.size,
      data.apply,
      data.received,
      data.accepted,
      data.rejected,
      data.pending
    ]);

  printTable(
    ['批次号', '记录数', 'SKU数', '申请', '实收', '确认', '拒收', '待确认'],
    tableData
  );

  if (Object.keys(batchData).length > (options.limit || 30)) {
    console.log(`... 还有 ${Object.keys(batchData).length - (options.limit || 30)} 个批次`);
  }
}

async function showByStatusReport(options) {
  const records = await listRecords({});
  const statusData = {};

  records.forEach(r => {
    const status = r.status || 'unknown';
    if (!statusData[status]) {
      statusData[status] = {
        records: 0,
        batches: new Set(),
        apply: 0,
        received: 0,
        accepted: 0
      };
    }
    statusData[status].records++;
    statusData[status].batches.add(r.batch_no);
    statusData[status].apply += r.apply_qty || 0;
    statusData[status].received += r.received_qty || 0;
    statusData[status].accepted += r.supplier_accepted_qty || 0;
  });

  console.log('\n【按状态分组报表】');
  const tableData = Object.entries(statusData)
    .map(([status, data]) => [
      getStatusColor(status)(status),
      data.records,
      data.batches.size,
      data.apply,
      data.received,
      data.accepted
    ]);

  printTable(
    ['状态', '记录数', '批次', '申请', '实收', '确认'],
    tableData
  );
}

async function showBySupplierReport(options) {
  const records = await listRecords({});
  const supplierData = {};

  records.forEach(r => {
    const supplier = r.supplier_name || r.supplier_code || '未知';
    if (!supplierData[supplier]) {
      supplierData[supplier] = {
        records: 0,
        batches: new Set(),
        skus: new Set(),
        apply: 0,
        accepted: 0,
        rejected: 0
      };
    }
    supplierData[supplier].records++;
    supplierData[supplier].batches.add(r.batch_no);
    supplierData[supplier].skus.add(r.sku_code);
    supplierData[supplier].apply += r.apply_qty || 0;
    supplierData[supplier].accepted += r.supplier_accepted_qty || 0;
    supplierData[supplier].rejected += r.supplier_rejected_qty || 0;
  });

  console.log('\n【按供应商分组报表】');
  const tableData = Object.entries(supplierData)
    .slice(0, options.limit || 30)
    .map(([supplier, data]) => [
      truncateString(supplier, 20),
      data.records,
      data.batches.size,
      data.skus.size,
      data.apply,
      data.accepted,
      data.rejected
    ]);

  printTable(
    ['供应商', '记录数', '批次', 'SKU', '申请', '确认', '拒收'],
    tableData
  );

  if (Object.keys(supplierData).length > (options.limit || 30)) {
    console.log(`... 还有 ${Object.keys(supplierData).length - (options.limit || 30)} 个供应商`);
  }
}

module.exports = { reportCommand };
