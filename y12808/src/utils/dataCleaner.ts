import type { RawSampleRow, CleanIssue, Sample } from '@/types';
import { SampleStatus } from '@/types';

export function cleanData(rows: RawSampleRow[]): {
  cleaned: Sample[];
  issues: CleanIssue[];
  originalRowMap: Map<number, string>;
} {
  const cleaned: Sample[] = [];
  const issues: CleanIssue[] = [];
  const originalRowMap = new Map<number, string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const rowIssues: CleanIssue[] = [];

    let barcode = (row.barcode || '').trim();
    if (!barcode) {
      rowIssues.push({ row: rowNum, field: '条码', issue: '条码为空', severity: 'error' });
    } else if (barcode.length < 3) {
      rowIssues.push({ row: rowNum, field: '条码', issue: '条码过短，可能无效', severity: 'warning' });
    }

    let batchNo = (row.batchNo || '').trim();
    if (!batchNo) {
      rowIssues.push({ row: rowNum, field: '批次号', issue: '批次号为空', severity: 'warning' });
      batchNo = 'UNKNOWN';
    }

    let sampleType = (row.sampleType || '').trim();
    if (!sampleType) {
      rowIssues.push({ row: rowNum, field: '样本类型', issue: '样本类型未填写', severity: 'info' });
      sampleType = '未知类型';
    }

    const name = (row.name || '').trim() || undefined;

    let concentration: number | undefined;
    if (row.concentration) {
      const num = parseFloat(row.concentration);
      if (isNaN(num)) {
        rowIssues.push({ row: rowNum, field: '浓度', issue: '浓度格式无效', severity: 'warning' });
      } else if (num < 0) {
        rowIssues.push({ row: rowNum, field: '浓度', issue: '浓度为负值', severity: 'error' });
      } else {
        concentration = num;
      }
    }

    let cellCount: number | undefined;
    if (row.cellCount) {
      const num = parseInt(row.cellCount, 10);
      if (isNaN(num)) {
        rowIssues.push({ row: rowNum, field: '细胞数', issue: '细胞数格式无效', severity: 'warning' });
      } else if (num < 0) {
        rowIssues.push({ row: rowNum, field: '细胞数', issue: '细胞数为负值', severity: 'error' });
      } else {
        cellCount = num;
      }
    }

    const remark = (row.remark || '').trim() || undefined;

    const hasError = rowIssues.some((i) => i.severity === 'error');
    if (!hasError && barcode) {
      const id = `sample_${Date.now()}_${barcode}`;
      const now = new Date().toISOString();

      const sample: Sample = {
        id,
        barcode,
        batchNo,
        sampleType,
        status: SampleStatus.PENDING,
        name,
        concentration,
        cellCount,
        remark,
        createdAt: now,
        updatedAt: now
      };

      cleaned.push(sample);
      originalRowMap.set(rowNum, id);
    }

    issues.push(...rowIssues);
  });

  return { cleaned, issues, originalRowMap };
}

export function getIssueCountBySeverity(issues: CleanIssue[]) {
  return {
    error: issues.filter((i) => i.severity === 'error').length,
    warning: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length
  };
}
