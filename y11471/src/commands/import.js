const fs = require('fs');
const { importApplications, importInspections, importLogistics, importSms, importExceptions } = require('../importService');
const { printSuccess, printError, printInfo, printWarning, printTable } = require('../utils');
const { getImportFailures } = require('../recordService');

const SOURCE_TYPES = {
  application: importApplications,
  inspection: importInspections,
  logistics: importLogistics,
  sms: importSms,
  exception: importExceptions
};

const SOURCE_NAMES = {
  application: '退供申请',
  inspection: '质检照片',
  logistics: '物流回单',
  sms: '短信截图',
  exception: '异常照片'
};

async function importCommand(sourceType, filePath, options) {
  try {
    if (!SOURCE_TYPES[sourceType]) {
      printError(`不支持的数据源类型: ${sourceType}`);
      console.log('\n支持的类型:');
      Object.keys(SOURCE_TYPES).forEach(type => {
        console.log(`  ${type} - ${SOURCE_NAMES[type]}`);
      });
      process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
      printError(`文件不存在: ${filePath}`);
      process.exit(1);
    }

    printInfo(`正在导入 ${SOURCE_NAMES[sourceType]}: ${filePath}`);
    
    const importFn = SOURCE_TYPES[sourceType];
    const result = await importFn(filePath, {
      operator: options.operator || 'system',
      note: options.note || ''
    });

    printSuccess(`导入完成!`);
    console.log(`  批次ID: ${result.batchId}`);
    console.log(`  成功: ${result.successCount} 条`);
    console.log(`  失败: ${result.failCount} 条`);

    if (result.failCount > 0) {
      printWarning(`${result.failCount} 条数据导入失败，使用 "wra check --failures" 查看详情`);
    }

    if (options.showFailures && result.failCount > 0) {
      const failures = await getImportFailures(result.batchId);
      console.log('\n失败清单:');
      printTable(
        ['行号', '错误原因'],
        failures.slice(0, 10).map(f => [f.original_line_no || '-', f.error_reason])
      );
      if (failures.length > 10) {
        console.log(`... 还有 ${failures.length - 10} 条失败记录`);
      }
    }

  } catch (error) {
    printError(`导入失败: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

async function importBatchCommand(files, options) {
  printInfo('批量导入模式');
  for (const file of files) {
    const fileName = file.toLowerCase();
    let sourceType = null;
    
    if (fileName.includes('申请') || fileName.includes('application')) {
      sourceType = 'application';
    } else if (fileName.includes('质检') || fileName.includes('inspection')) {
      sourceType = 'inspection';
    } else if (fileName.includes('物流') || fileName.includes('logistics') || fileName.includes('回单')) {
      sourceType = 'logistics';
    } else if (fileName.includes('短信') || fileName.includes('sms')) {
      sourceType = 'sms';
    } else if (fileName.includes('异常') || fileName.includes('exception')) {
      sourceType = 'exception';
    }

    if (sourceType) {
      console.log(`\n${'='.repeat(50)}`);
      await importCommand(sourceType, file, options);
    } else {
      printWarning(`无法识别文件类型，跳过: ${file}`);
    }
  }
}

module.exports = { importCommand, importBatchCommand, SOURCE_TYPES, SOURCE_NAMES };
