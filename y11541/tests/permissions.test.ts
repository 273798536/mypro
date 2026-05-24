import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { initDatabase, resetDatabase, closeDb } from '../src/db/database';
import { checkPermission, filterFieldsByRole, PERMISSIONS } from '../src/config/permissions';

describe('权限测试', () => {
  beforeAll(() => {
    process.env.AD_INSPECT_DB = ':memory:';
    process.env.AD_INSPECT_USER = 'admin';
    initDatabase();
  });

  afterAll(() => {
    closeDb();
  });

  test('readonly用户只能查看不能修改', () => {
    expect(checkPermission('readonly', 'view')).toBe(true);
    expect(checkPermission('readonly', 'report')).toBe(true);
    expect(checkPermission('readonly', 'export')).toBe(true);
    expect(checkPermission('readonly', 'import')).toBe(false);
    expect(checkPermission('readonly', 'fix')).toBe(false);
    expect(checkPermission('readonly', 'approve')).toBe(false);
  });

  test('entry用户可以导入和修复但不能审核', () => {
    expect(checkPermission('entry', 'import')).toBe(true);
    expect(checkPermission('entry', 'check')).toBe(true);
    expect(checkPermission('entry', 'fix')).toBe(true);
    expect(checkPermission('entry', 'approve')).toBe(false);
    expect(checkPermission('entry', 'user:create')).toBe(false);
  });

  test('review用户可以审核', () => {
    expect(checkPermission('review', 'approve')).toBe(true);
    expect(checkPermission('review', 'reject')).toBe(true);
    expect(checkPermission('review', 'fix')).toBe(true);
    expect(checkPermission('review', 'user:create')).toBe(false);
  });

  test('manager用户拥有所有权限', () => {
    expect(checkPermission('manager', 'init')).toBe(true);
    expect(checkPermission('manager', 'user:create')).toBe(true);
    expect(checkPermission('manager', 'approve')).toBe(true);
    expect(checkPermission('manager', 'import')).toBe(true);
  });

  test('不同角色可见字段不同', () => {
    const testData = {
      id: 'test-123',
      material_id: 'MAT001',
      material_name: '测试',
      platform: '抖音',
      record_date: '2024-01-15',
      created_by: 'user1',
      request_id: 'req-123',
      raw_data: '{}'
    };
    
    const readonlyFiltered = filterFieldsByRole('readonly', testData);
    expect(readonlyFiltered).not.toHaveProperty('id');
    expect(readonlyFiltered).not.toHaveProperty('created_by');
    expect(readonlyFiltered).toHaveProperty('material_id');
    
    const entryFiltered = filterFieldsByRole('entry', testData);
    expect(entryFiltered).toHaveProperty('id');
    expect(entryFiltered).not.toHaveProperty('created_by');
    
    const managerFiltered = filterFieldsByRole('manager', testData);
    expect(managerFiltered).toHaveProperty('id');
    expect(managerFiltered).toHaveProperty('created_by');
    expect(managerFiltered).toHaveProperty('request_id');
  });
});
