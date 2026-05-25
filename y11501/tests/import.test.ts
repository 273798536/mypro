import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ImportService } from '../src/services/ImportService';
import { FileParserService } from '../src/services/FileParserService';
import { AuthService } from '../src/services/AuthService';
import { connectDatabase, syncDatabaseSchema } from '../src/config/database';
import { DataSourceType, RecordStatus, UserRole } from '../src/types';

const TEST_DB_DIR = path.join(os.tmpdir(), 'spi-cli-test');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db');

describe('ImportService', () => {
  let dataSource: DataSource;
  let importService: ImportService;
  let authService: AuthService;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
    dataSource = await connectDatabase();
    await syncDatabaseSchema(true);
    importService = new ImportService();
    authService = new AuthService();
    await authService.initDefaultUsers();
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('FileParserService', () => {
    const fileParser = new FileParserService();

    it('should detect source type from filename', () => {
      expect(fileParser.detectSourceType('repair_orders.csv')).toBe(DataSourceType.REPAIR_ORDER);
      expect(fileParser.detectSourceType('spare_part_scan.xlsx')).toBe(DataSourceType.SPARE_PART_SCAN);
      expect(fileParser.detectSourceType('客户签收.csv')).toBe(DataSourceType.CUSTOMER_RECEIPT);
      expect(fileParser.detectSourceType('unknown.csv')).toBeNull();
    });
  });

  describe('幂等性测试', () => {
    it('多次导入相同数据应产生多条批次记录', async () => {
      const testCsvPath = path.join(__dirname, '../samples/repair_orders.csv');
      
      const result1 = await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');
      const result2 = await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');

      expect(result1.batchNumber).not.toBe(result2.batchNumber);
      expect(result1.batchId).not.toBe(result2.batchId);

      const { batches } = await importService.getBatchList(1, 10);
      expect(batches.length).toBeGreaterThanOrEqual(2);
    });

    it('导入批次号应该唯一', async () => {
      const testCsvPath = path.join(__dirname, '../samples/repair_orders.csv');
      const batchNumbers = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const result = await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');
        expect(batchNumbers.has(result.batchNumber)).toBe(false);
        batchNumbers.add(result.batchNumber);
      }
    });
  });

  describe('数据完整性测试', () => {
    it('应正确导入并保留原始行号', async () => {
      const testCsvPath = path.join(__dirname, '../samples/repair_orders.csv');
      const result = await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');

      expect(result.successCount).toBeGreaterThan(0);
      expect(result.totalRecords).toBe(10);

      const batchDetail = await importService.getBatchDetail(result.batchId);
      expect(batchDetail).not.toBeNull();
      
      if (batchDetail && batchDetail.repairOrders) {
        batchDetail.repairOrders.forEach(order => {
          expect(order.originalRowNumber).toBeDefined();
          expect(order.originalRowNumber).toBeGreaterThanOrEqual(2);
          expect(order.originalRowData).toBeDefined();
          expect(order.originalRowData).toContain('RO20240501');
        });
      }
    });

    it('应记录导入失败的记录', async () => {
      const testCsvPath = path.join(__dirname, '../samples/repair_orders.csv');
      const result = await importService.importFile(testCsvPath, DataSourceType.REPAIR_ORDER, 'admin');

      expect(result.failedRecords).toBeDefined();
      expect(Array.isArray(result.failedRecords)).toBe(true);
    });
  });
});
