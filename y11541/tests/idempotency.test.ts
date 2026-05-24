import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initDatabase, resetDatabase, closeDb } from '../src/db/database';
import { importFromCSV } from '../src/services/importService';
import { findByRequestId, getAllRecords } from '../src/services/recordService';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

describe('幂等性测试', () => {
  beforeAll(async () => {
    process.env.AD_INSPECT_DB = ':memory:';
    process.env.AD_INSPECT_USER = 'admin';
    await initDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(() => {
    closeDb();
  });

  test('相同请求ID重复导入应只更新而不新增记录', async () => {
    const requestId = uuidv4();
    
    const testCsv = `material_id,material_name,platform,record_date,impressions,clicks,cost
MAT001,测试素材,抖音,2024-01-15,10000,500,100.00`;
    
    fs.writeFileSync('/tmp/test_idempotent_1.csv', testCsv);
    
    const result1 = await importFromCSV('/tmp/test_idempotent_1.csv', 'cost_daily', requestId);
    expect(result1.total).toBe(1);
    expect(result1.duplicate).toBe(0);
    
    const recordsAfterFirst = await findByRequestId(requestId);
    expect(recordsAfterFirst.length).toBe(1);
    
    const result2 = await importFromCSV('/tmp/test_idempotent_1.csv', 'cost_daily', requestId);
    expect(result2.total).toBe(1);
    expect(result2.duplicate).toBe(1);
    
    const recordsAfterSecond = await findByRequestId(requestId);
    expect(recordsAfterSecond.length).toBe(1);
    
    const allRecords = await getAllRecords(100);
    expect(allRecords.length).toBe(1);
    
    fs.unlinkSync('/tmp/test_idempotent_1.csv');
  }, 30000);

  test('不同请求ID应正确去重', async () => {
    const testCsv = `material_id,material_name,platform,record_date,impressions,clicks,cost
MAT001,测试素材,快手,2024-01-15,10000,500,100.00`;
    
    fs.writeFileSync('/tmp/test_idempotent_2.csv', testCsv);
    
    const result1 = await importFromCSV('/tmp/test_idempotent_2.csv', 'cost_daily', uuidv4());
    expect(result1.duplicate).toBe(0);
    
    const result2 = await importFromCSV('/tmp/test_idempotent_2.csv', 'cost_daily', uuidv4());
    expect(result2.duplicate).toBe(1);
    
    const allRecords = await getAllRecords(100);
    expect(allRecords.length).toBe(1);
    
    fs.unlinkSync('/tmp/test_idempotent_2.csv');
  }, 30000);

  test('更新数据更新后记录应保留变更历史', async () => {
    const requestId = uuidv4();
    
    const csv1 = `material_id,material_name,platform,record_date,impressions,clicks,cost
MAT003,历史名称,抖音,2024-01-16,8000,400,80.00`;
    
    const csv2 = `material_id,material_name,platform,record_date,impressions,clicks,cost
MAT003,历史名称,抖音,2024-01-16,9000,450,90.00`;
    
    fs.writeFileSync('/tmp/test_history_1.csv', csv1);
    fs.writeFileSync('/tmp/test_history_2.csv', csv2);
    
    await importFromCSV('/tmp/test_history_1.csv', 'cost_daily', requestId);
    await importFromCSV('/tmp/test_history_2.csv', 'cost_daily', requestId);
    
    const records = await findByRequestId(requestId);
    expect(records.length).toBe(1);
    expect(records[0].impressions).toBe(9000);
    expect(records[0].cost).toBe(90);
    
    fs.unlinkSync('/tmp/test_history_1.csv');
    fs.unlinkSync('/tmp/test_history_2.csv');
  }, 30000);
});
