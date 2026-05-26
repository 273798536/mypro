const { DataImportService } = require('./dist/services/dataImport');
const { ReconciliationService } = require('./dist/services/reconciliation');
const path = require('path');

const operator = {
  id: 'test-user-001',
  name: 'TestUser',
  role: 'QualityManager'
};

async function testImport() {
  console.log('=== 多数据源导入测试 ===\n');
  
  const importService = new DataImportService();

  console.log('1. 导入返修记录...');
  try {
    const result = await importService.importFromFile(
      path.join(__dirname, 'examples/sample_repair_records.csv'),
      'repair_record',
      operator,
      { skipHeader: true }
    );
    console.log(`   成功: ${result.successCount}, 失败: ${result.failedCount}`);
    if (result.errors.length > 0) {
      console.log('   错误:');
      result.errors.forEach(e => console.log(`     - ${e.fieldName}: ${e.errorCode}: ${e.originalValue}`));
    }
  } catch (error) {
    console.error('   导入失败:', error.message);
  }

  console.log('\n2. 导入扣款明细...');
  try {
    const result = await importService.importFromFile(
      path.join(__dirname, 'examples/sample_deduction_details.csv'),
      'deduction_detail',
      operator,
      { skipHeader: true }
    );
    console.log(`   成功: ${result.successCount}, 失败: ${result.failedCount}`);
    if (result.errors.length > 0) {
      console.log('   错误:');
      result.errors.forEach(e => console.log(`     - ${e.fieldName}: ${e.errorCode}: ${e.originalValue}`));
    }
  } catch (error) {
    console.error('   导入失败:', error.message);
  }

  console.log('\n=== 测试完成 ===');
}

testImport().catch(console.error);
