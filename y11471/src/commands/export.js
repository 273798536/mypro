const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { listRecords, getImportFailures, getChangeHistory, getImportBatches } = require('../recordService');
const { printSuccess, printError, printInfo } = require('../utils');

async function exportCommand(format, outputPath, options) {
  try {
    const validFormats = ['xlsx', 'csv', 'json'];
    if (!validFormats.includes(format)) {
      printError(`不支持的格式: ${format}`);
      console.log('支持的格式: xlsx, csv, json');
      process.exit(1);
    }

    const filters = {};
    if (options.batch) filters.batchNo = options.batch;
    if (options.sku) filters.skuCode = options.sku;
    if (options.supplier) filters.supplierCode = options.supplier;
    if (options.status) filters.status = options.status;

    printInfo('正在导出数据...');

    const records = await listRecords(filters);
    
    const exportData = {
      records: records.map(r => ({
        批次号: r.batch_no,
        SKU编码: r.sku_code,
        商品名称: r.sku_name || '',
        供应商编码: r.supplier_code || '',
        供应商名称: r.supplier_name || '',
        仓库编码: r.warehouse_code || '',
        申请数量: r.apply_qty || 0,
        质检数量: r.inspection_qty || 0,
        发货数量: r.shipped_qty || 0,
        实收数量: r.received_qty || 0,
        异常数量: r.exception_qty || 0,
        短信确认数量: r.sms_confirmed_qty || 0,
        供应商确认数量: r.supplier_accepted_qty || 0,
        供应商拒收数量: r.supplier_rejected_qty || 0,
        供应商待确认数量: r.supplier_pending_qty || 0,
        最终数量: r.final_qty || 0,
        状态: r.status || '',
        判定: r.judgment || '',
        判定备注: r.judgment_note || '',
        数据质量: r.data_quality || '',
        记录ID: r.id,
        创建时间: r.created_at || '',
        更新时间: r.updated_at || ''
      }))
    };

    if (options.failures) {
      const failures = await getImportFailures();
      exportData.import_failures = failures.map(f => ({
        批次ID: f.batch_id,
        数据源类型: f.source_type,
        源文件: f.source_file || '',
        原始行号: f.original_line_no || '',
        原始数据: JSON.stringify(f.raw_data || {}),
        错误原因: f.error_reason || '',
        导入时间: f.created_at || ''
      }));
    }

    if (options.history) {
      const history = await getChangeHistory({ limit: 1000 });
      exportData.change_history = history.map(h => ({
        记录ID: h.record_id,
        字段名: h.field_name,
        原值: h.old_value,
        新值: h.new_value,
        操作人: h.changed_by || '',
        变更备注: h.change_note || '',
        变更时间: h.created_at || ''
      }));
    }

    if (options.batches) {
      const batches = await getImportBatches();
      exportData.import_batches = batches.map(b => ({
        批次ID: b.id,
        数据源类型: b.source_type,
        源文件: b.source_file,
        成功数量: b.success_count,
        失败数量: b.fail_count,
        操作人: b.operator || '',
        备注: b.import_note || '',
        导入时间: b.created_at || ''
      }));
    }

    const actualOutput = outputPath || `export_${new Date().toISOString().slice(0, 10)}.${format}`;
    
    if (format === 'json') {
      fs.writeFileSync(actualOutput, JSON.stringify(exportData, null, 2), 'utf8');
    } else if (format === 'csv') {
      const recordsCsv = toCsv(exportData.records);
      fs.writeFileSync(actualOutput, recordsCsv, 'utf8');
      
      if (options.failures && exportData.import_failures.length > 0) {
        const failuresPath = actualOutput.replace('.csv', '_failures.csv');
        fs.writeFileSync(failuresPath, toCsv(exportData.import_failures), 'utf8');
      }
    } else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(wb, 
        XLSX.utils.json_to_sheet(exportData.records), 
        '退供记录'
      );
      
      if (options.failures && exportData.import_failures.length > 0) {
        XLSX.utils.book_append_sheet(wb, 
          XLSX.utils.json_to_sheet(exportData.import_failures), 
          '导入失败'
        );
      }
      
      if (options.history && exportData.change_history.length > 0) {
        XLSX.utils.book_append_sheet(wb, 
          XLSX.utils.json_to_sheet(exportData.change_history), 
          '变更历史'
        );
      }
      
      if (options.batches && exportData.import_batches.length > 0) {
        XLSX.utils.book_append_sheet(wb, 
          XLSX.utils.json_to_sheet(exportData.import_batches), 
          '导入批次'
        );
      }
      
      XLSX.writeFile(wb, actualOutput);
    }

    printSuccess(`导出成功! 文件: ${path.resolve(actualOutput)}`);
    console.log(`  记录数: ${exportData.records.length}`);
    if (exportData.import_failures) console.log(`  失败记录: ${exportData.import_failures.length}`);
    if (exportData.change_history) console.log(`  变更历史: ${exportData.change_history.length}`);
    if (exportData.import_batches) console.log(`  导入批次: ${exportData.import_batches.length}`);

  } catch (error) {
    printError(`导出失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

function toCsv(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerLine = headers.map(h => `"${h}"`).join(',');
  
  const lines = data.map(row => 
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [headerLine, ...lines].join('\n');
}

module.exports = { exportCommand };
