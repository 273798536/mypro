import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { BusinessIssueService } from '../src/services/BusinessIssueService';
import { ImportService } from '../src/services/ImportService';
import { initializeDatabase } from '../src/config/database';
import { DataSourceType, BusinessIssueType, RecordStatus } from '../src/types';

const TEST_DB_DIR = path.join(os.tmpdir(), 'spi-cli-test-business');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test.db');

describe('BusinessIssueService', () => {
  let dataSource: DataSource;
  let businessIssueService: BusinessIssueService;
  let importService: ImportService;

  beforeAll(async () => {
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
    dataSource = await initializeDatabase(true);
    businessIssueService = new BusinessIssueService();
    importService = new ImportService();

    const repairOrderCsv = path.join(__dirname, '../samples/repair_orders.csv');
    await importService.importFile(repairOrderCsv, DataSourceType.REPAIR_ORDER, 'admin');

    const sparePartCsv = path.join(__dirname, '../samples/spare_part_scans.csv');
    await importService.importFile(sparePartCsv, DataSourceType.SPARE_PART_SCAN, 'admin');
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('业务问题检测', () => {
    it('应检测到先领后补单问题', async () => {
      const result = await businessIssueService.checkAll('admin');

      expect(result.totalChecked).toBeGreaterThan(0);
      expect(result.issueCount).toBeGreaterThan(0);

      const lateOrderIssues = result.issues.filter(
        i => i.issueType === BusinessIssueType.LATE_ORDER_AFTER_PICKUP
      );
      expect(lateOrderIssues.length).toBeGreaterThan(0);

      lateOrderIssues.forEach(issue => {
        expect(issue.repairOrderNo).toBeDefined();
        expect(issue.engineerName).toBeDefined();
        expect(issue.description).toContain('先领用');
        expect(issue.handlingSuggestion).toContain('核实');
      });
    });

    it('应检测到退回报废混淆问题', async () => {
      const result = await businessIssueService.checkAll('admin');

      const scrapConfusionIssues = result.issues.filter(
        i => i.issueType === BusinessIssueType.RETURN_SCRAP_CONFUSION
      );
      expect(scrapConfusionIssues.length).toBeGreaterThan(0);

      scrapConfusionIssues.forEach(issue => {
        expect(issue.description).toContain('退回');
        expect(issue.description).toContain('报废');
      });
    });

    it('多次执行check结果应一致（幂等性）', async () => {
      const result1 = await businessIssueService.checkAll('admin');
      const result2 = await businessIssueService.checkAll('admin');

      expect(result1.issueCount).toBe(result2.issueCount);
      expect(result1.totalChecked).toBe(result2.totalChecked);
    });
  });

  describe('问题处理', () => {
    it('处理问题后状态应变化', async () => {
      const result = await businessIssueService.checkAll('admin');
      const pendingIssues = result.issues.filter(i => i.status === RecordStatus.PENDING);

      expect(pendingIssues.length).toBeGreaterThan(0);

      const issueToHandle = pendingIssues[0];
      const handledIssue = await businessIssueService.handleIssue(
        issueToHandle.id,
        '已核实并处理',
        'admin'
      );

      expect(handledIssue).not.toBeNull();
      expect(handledIssue!.status).toBe(RecordStatus.APPROVED);
      expect(handledIssue!.handlingResult).toBe('已核实并处理');
      expect(handledIssue!.handledBy).toBe('admin');
      expect(handledIssue!.handledAt).toBeDefined();
    });

    it('应生成问题统计', async () => {
      await businessIssueService.checkAll('admin');
      const stats = await businessIssueService.getIssueStats();

      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.topEngineers).toBeDefined();
      expect(Array.isArray(stats.topEngineers)).toBe(true);
    });
  });
});
