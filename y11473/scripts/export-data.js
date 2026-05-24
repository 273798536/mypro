const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/models');
const ExportService = require('../src/services/ExportService');

const exportDir = path.join(__dirname, '../exports');
fs.mkdirSync(exportDir, { recursive: true });

async function exportAllData() {
  console.log('开始导出全部数据...');
  
  try {
    const result = await ExportService.exportAll({}, exportDir);
    console.log('导出完成！');
    console.log(`压缩包: ${result.zipPath}`);
    console.log('详细结果:');
    Object.entries(result.results).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.count} 条`);
    });
    process.exit(0);
  } catch (error) {
    console.error('导出失败:', error);
    process.exit(1);
  }
}

async function exportByType(type) {
  console.log(`开始导出 ${type}...`);
  try {
    let result;
    switch (type) {
      case 'return':
        result = await ExportService.exportReturnApplications({}, exportDir);
        break;
      case 'exception':
        result = await ExportService.exportExceptions({}, exportDir);
        break;
      default:
        console.log('未知类型，使用: return | exception | all');
        process.exit(1);
    }
    console.log(`导出完成: ${result.filePath}`);
    console.log(`共 ${result.count} 条记录`);
    process.exit(0);
  } catch (error) {
    console.error('导出失败:', error);
    process.exit(1);
  }
}

const type = process.argv[2] || 'all';
if (type === 'all') {
  exportAllData();
} else {
  exportByType(type);
}
