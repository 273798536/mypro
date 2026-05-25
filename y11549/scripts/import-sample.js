const path = require('path');
const importService = require('../src/services/importService');
const logger = require('../src/config/logger');

const sampleDataDir = path.join(__dirname, '../sample-data');

async function importAll() {
  console.log('\n📦 开始导入样例数据...\n');

  const imports = [
    { type: 'material_list', file: 'material-list.csv', name: '物料清单' },
    { type: 'logistics_receipt', file: 'logistics-receipt.csv', name: '物流签收' },
    { type: 'shift_record', file: 'shift-records.csv', name: '班次记录' },
    { type: 'borrow_record', file: 'borrow-records.csv', name: '借用记录' },
    { type: 'price_adjustment', file: 'price-adjustment.csv', name: '价格调整' }
  ];

  for (const item of imports) {
    try {
      console.log(`导入中: ${item.name}...`);
      const result = await importService.importFile(
        path.join(sampleDataDir, item.file),
        item.file,
        item.type,
        'demo_user'
      );
      console.log(`✅ ${item.name}: 成功 ${result.successCount} 条, 失败 ${result.failedCount} 条`);
      if (result.errors.length > 0) {
        console.log(`   ⚠️  错误: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.log(`❌ ${item.name} 失败: ${error.message}`);
      logger.error(`导入失败 - ${item.name}`, { error: error.message });
    }
  }

  console.log('\n🎉 样例数据导入完成!\n');
}

importAll().catch(console.error);
