import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initDatabase, resetDatabase, closeDb } from '../src/db/database';
import { createRecord, updateRecordStatus, getRecordById } from '../src/services/recordService';
import { checkAllDirty, saveDirtyRecords, getDirtyRecords } from '../src/services/dirtyRecordService';
import { v4 as uuidv4 } from 'uuid';

describe('状态流转测试', () => {
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

  test('新记录初始状态应为pending', async () => {
    const data = {
      material_id: 'MAT001',
      material_name: '测试素材',
      platform: '抖音',
      record_date: '2024-01-15',
      impressions: 10000,
      clicks: 500,
      cost: 100
    };
    
    const record = await createRecord(data, 'cost_daily', 1, uuidv4());
    expect(record.status).toBe('pending');
  });

  test('脏记录检测后状态应为dirty', async () => {
    const data = {
      material_id: 'MAT002',
      material_name: '',
      platform: '抖音',
      record_date: '2024-01-15'
    };
    
    const record = await createRecord(data, 'cost_daily', 1, uuidv4());
    
    const dirtyResults = checkAllDirty(data, 'cost_daily', []);
    expect(dirtyResults.length).toBeGreaterThan(0);
    
    await saveDirtyRecords(record.id, dirtyResults);
    await updateRecordStatus(record.id, 'dirty', '发现脏数据');
    
    const updatedRecord = await getRecordById(record.id);
    expect(updatedRecord!.status).toBe('dirty');
  });

  test('修复后状态应为fixed', async () => {
    const data = {
      material_id: 'MAT003',
      material_name: '有问题的素材',
      platform: '抖音',
      record_date: 'invalid-date'
    };
    
    const record = await createRecord(data, 'cost_daily', 1, uuidv4());
    
    const dirtyResults = checkAllDirty(data, 'cost_daily', []);
    await saveDirtyRecords(record.id, dirtyResults);
    await updateRecordStatus(record.id, 'dirty', '发现脏数据');
    
    const dirtyRecords = await getDirtyRecords(record.id);
    expect(dirtyRecords.length).toBeGreaterThan(0);
    
    await updateRecordStatus(record.id, 'fixed', '手动修复');
    const fixedRecord = await getRecordById(record.id);
    expect(fixedRecord!.status).toBe('fixed');
  });

  test('审核通过后状态应为approved', async () => {
    const data = {
      material_id: 'MAT004',
      material_name: '待审核素材',
      platform: '抖音',
      record_date: '2024-01-15'
    };
    
    const record = await createRecord(data, 'cost_daily', 1, uuidv4());
    await updateRecordStatus(record.id, 'approved', '审核通过');
    
    const approvedRecord = await getRecordById(record.id);
    expect(approvedRecord!.status).toBe('approved');
  });
});
