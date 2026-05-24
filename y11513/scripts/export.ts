import '../src/models/database';
import { importExportService } from '../src/services/import-export.service';
import { RecordType } from '../src/types';
import { logger } from '../src/utils/logger';

async function exportAll(): Promise<void> {
  const recordTypes = [
    RecordType.BORROW_APPLICATION,
    RecordType.EXPRESS_ORDER,
    RecordType.COMPENSATION_RECORD,
    RecordType.SHIFT_RECORD,
  ];

  console.log('\n📤 开始导出所有数据...\n');

  for (const recordType of recordTypes) {
    try {
      const outputPath = await importExportService.exportToCsv(recordType);
      console.log(`  ✅ ${recordType}: ${outputPath}`);
    } catch (error) {
      logger.error(`导出 ${recordType} 失败`, error as Error);
      console.log(`  ❌ ${recordType}: 导出失败 - ${(error as Error).message}`);
    }
  }

  console.log('\n✅ 导出完成！');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const recordType = args[0] as RecordType;

  if (recordType) {
    if (!Object.values(RecordType).includes(recordType)) {
      console.error(`❌ 无效的记录类型: ${recordType}`);
      console.log(`可用类型: ${Object.values(RecordType).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n📤 开始导出 ${recordType}...\n`);
    const outputPath = await importExportService.exportToCsv(recordType);
    console.log(`✅ 导出完成: ${outputPath}\n`);
  } else {
    await exportAll();
  }
}

main().catch(error => {
  console.error('\n❌ 导出失败:', error.message);
  process.exit(1);
});
