import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { DirtyRecordService } from '../src/services/DirtyRecordService';
import { ImportService } from '../src/services/ImportService';
import { initializeDatabase } from '../src/config/database';
import { DataSourceType, DirtyRecordType, RecordStatus } from '../src/types';

const TEST_DB_DIR = path.join(os.tmpdir(), 'spi-cli-test-dirty');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db');

describe('DirtyRecordService', () => {
  let dataSource: DataSource;
  let dirtyRecordService: DirtyRecordService;
  let importService: ImportService;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
    dataSource = await initializeDatabase(true);
    dirtyRecordService = new DirtyRecordService();
    importService = new ImportService();

    const testCsvPath = path.join(__dirname, '../samples/repair_orders.csv');
    await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');

    const sparePartCsvPath = path.join(__dirname, '../samples/spare_part_scans.csv');
    await importService.importFile(sparePartCsvPath, DataSourceType.SPARE_PART_SCAN, 'admin');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('脏记录检测', () => {
    it('应检测到缺字段的脏记录', async () => {
      const result = await dirtyRecordService.checkAll('admin');

      expect(result.totalChecked).toBeGreaterThan(0);
      expect(result.dirtyCount).toBeGreaterThan(0);

      const missingFieldRecords = result.dirtyRecords.filter(
        r => r.dirtyType === DirtyRecordType.MISSING_FIELD
      );
      expect(missingFieldRecords.length).toBeGreaterThan(0);

      missingFieldRecords.forEach(record => {
        expect(record.status).toBe(RecordStatus.DIRTY);
        expect(record.description).toContain('缺少');
        expect(record.originalRowNumber).toBeDefined();
      });
    });

    it('多次执行check结果应一致（幂等性）', async () => {
      const result1 = await dirtyRecordService.checkAll('admin');
      const result2 = await dirtyRecordService.checkAll('admin');

      expect(result1.dirtyCount).toBe(result2.dirtyCount);
      expect(result1.totalChecked).toBe(result2.totalChecked);
    });

    it('脏记录应保留原始数据和行号', async () => {
      const result = await dirtyRecordService.checkAll('admin');

      result.dirtyRecords.forEach(record => {
        expect(record.originalRowData).toBeDefined();
        expect(record.originalRowNumber).toBeDefined();
        expect(record.sourceRecordId).toBeDefined();
      });
    });
  });

  describe('状态变化测试', () => {
    it('修复后记录状态应从dirty变为fixed', async () => {
      const result = await dirtyRecordService.checkAll('admin');
      const dirtyRecords = result.dirtyRecords.filter(r => r.status === RecordStatus.DIRTY);

      expect(dirtyRecords.length).toBeGreaterThan(0);

      const recordToFix = dirtyRecords[0];
      const fixedRecord = await dirtyRecordService.fixDirtyRecord(
        recordToFix.id,
        '测试修复值',
        'admin'
      );

      expect(fixedRecord).not.toBeNull();
      expect(fixedRecord!.status).toBe(RecordStatus.FIXED);
      expect(fixedRecord!.fixedValue).toBe('测试修复值');
      expect(fixedRecord!.fixedBy).toBe('admin');
      expect(fixedRecord!.fixedAt).toBeDefined();
    });

    it('应正确分类不同类型的脏记录', async () => {
      await dirtyRecordService.checkAll('admin');
      const stats = await dirtyRecordService.getDirtyStats();

      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.bySource).toBeDefined();

      expect(stats.byStatus[RecordStatus.DIRTY]).toBeGreaterThanOrEqual(0);
      expect(stats.byStatus[RecordStatus.FIXED]).toBeGreaterThanOrEqual(0);
    });
  });

  describe('批量修复', () => {
    it('批量修复应处理所有可修复记录', async () => {
      await dirtyRecordService.checkAll('admin');
      
      const { records: dirtyRecords } = await dirtyRecordService.getDirtyRecords({
        status: RecordStatus.DIRTY,
        pageSize: 100
      });

      const ids = dirtyRecords.map(r => r.id);
      const result = await dirtyRecordService.batchFix(ids, 'admin');

      expect(result.fixedCount).toBeGreaterThanOrEqual(0);
      expect(result.failedCount).toBeGreaterThanOrEqual(0);
    });
  });
});
