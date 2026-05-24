const {
  exportChangeOrdersToCsv,
  exportSupplierStatementsToCsv,
  exportDirtyRecordsToCsv,
  exportAuditTrailToJson,
} = require('../services/exportService');

async function runAllExports() {
  console.log('=== 开始导出 ===\n');

  console.log('1. 导出变更单...');
  const r1 = await exportChangeOrdersToCsv();
  console.log(`   完成: ${r1.fileName} (${r1.count} 条)`);

  console.log('\n2. 导出供应商对账单...');
  const r2 = await exportSupplierStatementsToCsv();
  console.log(`   完成: ${r2.fileName} (${r2.count} 条)`);

  console.log('\n3. 导出脏记录...');
  const r3 = await exportDirtyRecordsToCsv();
  console.log(`   完成: ${r3.fileName} (${r3.count} 条)`);

  console.log('\n4. 导出审计轨迹...');
  const r4 = exportAuditTrailToJson();
  console.log(`   完成: ${r4.fileName} (${r4.count} 条)`);

  console.log('\n=== 全部导出完成 ===');
  console.log(`导出目录: exports/`);
}

if (require.main === module) {
  runAllExports().catch(console.error);
}

module.exports = { runAllExports };
