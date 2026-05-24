const { initDatabase, closeDatabase, run, get, all } = require('../src/database');
const batchService = require('../src/services/batchService');
const validationService = require('../src/services/validationService');
const reportService = require('../src/services/reportService');
const { getBatchReportData } = require('../src/services/reportService');

beforeAll(async () => {
  await initDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe('Integration Tests - Core Flow', () => {
  let testBatchId;

  test('1. Create a batch', async () => {
    const batch = await batchService.createBatch({
      projectName: '测试项目 - 门店投诉追溯',
      bidNo: 'BID-TEST-001',
      operator: 'test_operator',
      manualRemark: '重点关注资质文件有效性'
    });

    expect(batch).toBeDefined();
    expect(batch.batch_no).toBeDefined();
    expect(batch.status).toBe('DRAFT');
    testBatchId = batch.id;
    console.log(`Created batch with ID: ${testBatchId}, No: ${batch.batch_no}`);
  });

  test('2. Run consistency check - should find missing attachments', async () => {
    const result = await validationService.validateBatchConsistency(testBatchId, { autoPersist: true });

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    console.log(`Found ${result.issues.length} consistency issues`);
  });

  test('3. Verify failed records were persisted to database', async () => {
    const failedRecords = await all('SELECT * FROM failed_records WHERE batch_id = ?', [testBatchId]);
    
    expect(failedRecords.length).toBeGreaterThan(0);
    console.log(`Persisted failed records: ${failedRecords.length}`);
    
    failedRecords.forEach(r => {
      expect(r.id).toBeDefined();
      expect(r.error_type).toBeDefined();
      expect(r.error_message).toBeDefined();
      expect(r.source_type).toBeDefined();
      console.log(`  - Record #${r.id}: ${r.error_type} - ${r.error_message} (source: ${r.source_type})`);
    });
  });

  test('4. Get validation summary with counts', async () => {
    const summary = await validationService.getValidationSummary(testBatchId);
    
    expect(summary.totalCount).toBeGreaterThan(0);
    expect(summary.unhandledCount).toBeGreaterThan(0);
    expect(summary.correctedCount).toBe(0);
    expect(summary.needManualConfirmCount).toBeDefined();
    
    console.log('Validation Summary:');
    console.log(`  - Total: ${summary.totalCount}`);
    console.log(`  - Unhandled: ${summary.unhandledCount}`);
    console.log(`  - Corrected: ${summary.correctedCount}`);
    console.log(`  - Need Manual Confirm: ${summary.needManualConfirmCount}`);
  });

  test('5. Get batch report data with traceable records', async () => {
    const reportData = await getBatchReportData(testBatchId);
    
    expect(reportData.batch).toBeDefined();
    expect(reportData.validation).toBeDefined();
    expect(reportData.validation.failedRecords).toBeDefined();
    expect(reportData.validation.failedRecords.length).toBeGreaterThan(0);
    
    console.log('Report Data Validation:');
    console.log(`  - Total failed records in report: ${reportData.validation.failedRecords.length}`);
    
    reportData.validation.failedRecords.forEach(r => {
      expect(r.id).toBeDefined();
      expect(r.errorMessage).toBeDefined();
      expect(r.sourceType).toBeDefined();
      expect(r.isResolved).toBe(false);
      console.log(`  - Record #${r.id}: ${r.recordType} - ${r.errorMessage} (ID traceable)`);
    });

    expect(reportData.validation.unhandledRecords).toBeDefined();
    expect(reportData.validation.correctedRecords).toBeDefined();
    expect(reportData.validation.needManualConfirmRecords).toBeDefined();
    
    console.log(`  - Unhandled records with IDs: ${reportData.validation.unhandledRecords.map(r => r.id).join(', ')}`);
  });

  test('6. Resolve a failed record', async () => {
    const failedRecords = await all('SELECT * FROM failed_records WHERE batch_id = ? LIMIT 1', [testBatchId]);
    expect(failedRecords.length).toBe(1);
    
    const recordId = failedRecords[0].id;
    const resolved = await validationService.resolveFailedRecord(
      recordId,
      'reviewer_1',
      '已核对，确认数据无误，系历史遗留问题'
    );
    
    expect(resolved.is_resolved).toBe(1);
    expect(resolved.resolved_by).toBe('reviewer_1');
    console.log(`Resolved record #${recordId} by reviewer_1`);
  });

  test('7. Verify corrected count updated in summary', async () => {
    const summary = await validationService.getValidationSummary(testBatchId);
    
    expect(summary.correctedCount).toBe(1);
    expect(summary.unhandledCount).toBe(summary.totalCount - 1);
    console.log(`After resolution: Corrected=${summary.correctedCount}, Unhandled=${summary.unhandledCount}`);
  });

  test('8. Export report - should contain detailed records with IDs', async () => {
    const exportResult = await reportService.exportBatchReport(testBatchId, 'csv');
    
    expect(exportResult.exportId).toBeDefined();
    expect(exportResult.fileName).toBeDefined();
    expect(exportResult.reportData).toBeDefined();
    
    console.log('Export Result:');
    console.log(`  - Export ID: ${exportResult.exportId}`);
    console.log(`  - File: ${exportResult.fileName}`);
    console.log(`  - Report Data - Total: ${exportResult.reportData.validation.totalCount}`);
    console.log(`  - Report Data - Unhandled: ${exportResult.reportData.validation.unhandledCount}`);
    console.log(`  - Report Data - Corrected: ${exportResult.reportData.validation.correctedCount}`);
    console.log(`  - Report Data - Need Confirm: ${exportResult.reportData.validation.needManualConfirmCount}`);
    
    expect(exportResult.reportData.validation.totalCount).toBeGreaterThan(0);
  });

  test('9. Verify report summary was saved', async () => {
    const summaries = await all('SELECT * FROM report_summaries WHERE batch_id = ?', [testBatchId]);
    
    expect(summaries.length).toBeGreaterThan(0);
    
    const summary = summaries[0];
    expect(summary.total_count).toBeGreaterThan(0);
    expect(summary.unhandled_count).toBeDefined();
    expect(summary.corrected_count).toBeDefined();
    expect(summary.need_manual_confirm_count).toBeDefined();
    expect(summary.export_reference).toBeDefined();
    
    console.log('Saved Report Summary:');
    console.log(`  - Frozen Before: ${summary.frozen_before_status}`);
    console.log(`  - Frozen After: ${summary.frozen_after_status}`);
    console.log(`  - Manual Remark: ${summary.manual_remark}`);
    console.log(`  - Total Count: ${summary.total_count}`);
    console.log(`  - Unhandled: ${summary.unhandled_count}`);
    console.log(`  - Corrected: ${summary.corrected_count}`);
    console.log(`  - Need Confirm: ${summary.need_manual_confirm_count}`);
  });

  test('10. Data consistency check - all sources show same numbers', async () => {
    const summary = await validationService.getValidationSummary(testBatchId);
    const reportData = await getBatchReportData(testBatchId);
    const dbCount = await get('SELECT COUNT(*) as count FROM failed_records WHERE batch_id = ?', [testBatchId]);
    
    console.log('Data Consistency Check:');
    console.log(`  - DB count: ${dbCount.count}`);
    console.log(`  - Validation summary total: ${summary.totalCount}`);
    console.log(`  - Report data total: ${reportData.validation.totalCount}`);
    console.log(`  - Report failedRecords length: ${reportData.validation.failedRecords.length}`);
    
    expect(summary.totalCount).toBe(dbCount.count);
    expect(reportData.validation.totalCount).toBe(dbCount.count);
    expect(reportData.validation.failedRecords.length).toBe(dbCount.count);
    
    console.log('  ✓ All numbers match!');
  });
});
