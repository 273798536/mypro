import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3001/api/qc';

async function fetchApi(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, options);
  return res.json();
}

describe('重复导入场景测试', () => {
  it('首次导入应返回样本和重复组', async () => {
    const csvPath = path.join(__dirname, '..', 'test-data', 'duplicate_import_test.csv');
    const fileContent = fs.readFileSync(csvPath);
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'text/csv' });
    formData.append('file', blob, 'duplicate_import_test.csv');

    const res = await fetch(`${API_BASE}/samples/import`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.samples.length).toBe(5);
    expect(json.data.duplicates.length).toBeGreaterThan(0);

    const dupGroup = json.data.duplicates.find(
      (g: any[]) => g[0].barcode === 'CELL-DUP-001'
    );
    expect(dupGroup).toBeDefined();
    expect(dupGroup.length).toBe(3);

    for (const sample of dupGroup) {
      expect(sample.isDuplicate).toBe(true);
      expect(sample.duplicateGroupId).toBeTruthy();
      expect(sample.originalRowNumber).toBeGreaterThan(0);
      expect(sample.imageFileName).toBeTruthy();
      expect(sample.sourceRemark).toBeTruthy();
    }
  });

  it('重复条码样本应保留溯源信息', async () => {
    const json = await fetchApi('/duplicates');
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    const group = json.data.find((g: any[]) => g[0].barcode === 'CELL-DUP-001');
    expect(group).toBeDefined();
    expect(group.length).toBeGreaterThanOrEqual(3);

    const rowNumbers = group.map((s: any) => s.originalRowNumber);
    const imageNames = group.map((s: any) => s.imageFileName);
    const remarks = group.map((s: any) => s.sourceRemark);

    rowNumbers.forEach((rn: number) => expect(rn).toBeGreaterThan(0));
    imageNames.forEach((name: string | null) => expect(name).toBeTruthy());
    remarks.forEach((r: string | null) => expect(r).toBeTruthy());
  });

  it('再次导入相同文件应标记更多重复', async () => {
    const csvPath = path.join(__dirname, '..', 'test-data', 'duplicate_import_test.csv');
    const fileContent = fs.readFileSync(csvPath);
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'text/csv' });
    formData.append('file', blob, 'duplicate_import_test_again.csv');

    const res = await fetch(`${API_BASE}/samples/import`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();

    expect(json.success).toBe(true);

    const dupBarcodes = json.data.samples.filter((s: any) => s.isDuplicate);
    expect(dupBarcodes.length).toBeGreaterThan(0);
  });

  it('导师视图应正确分类', async () => {
    const json = await fetchApi('/supervisor/overview');
    expect(json.success).toBe(true);
    expect(json.data.total).toBeGreaterThan(0);
    expect(typeof json.data.completed).toBe('number');
    expect(typeof json.data.rejected).toBe('number');
    expect(typeof json.data.reviewNeeded).toBe('number');
  });
});
