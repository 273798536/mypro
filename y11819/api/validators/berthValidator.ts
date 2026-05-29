import type { ValidationIssue } from '@shared/types.js';
import type { BerthRow } from '../db/types.js';

const REQUIRED_FIELDS: (keyof BerthRow)[] = ['vessel_name', 'port'];
const CRITICAL_FIELDS: (keyof BerthRow)[] = ['berth_start', 'berth_end'];

export function validateBerth(records: BerthRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];

    for (const field of REQUIRED_FIELDS) {
      if (!rec[field]) {
        issues.push({
          row: i + 1,
          field: field as string,
          severity: 'error',
          message: `必填字段 ${field} 缺失`,
          suggestion: `请补充第 ${i + 1} 行的 ${field}，否则无法关联装卸记录和合同费率`,
        });
      }
    }

    for (const field of CRITICAL_FIELDS) {
      if (!rec[field]) {
        issues.push({
          row: i + 1,
          field: field as string,
          severity: 'warning',
          message: `关键字段 ${field} 缺失`,
          suggestion: field === 'berth_start'
            ? '缺少靠泊开始时间，将无法计算滞期费起算点。请补充或使用通知时间(NOR)作为替代'
            : '缺少靠泊结束时间，滞期费计算截止点将不明确。请补充离泊时间',
        });
      }
    }

    if (rec.berth_start && rec.berth_end) {
      const start = new Date(rec.berth_start);
      const end = new Date(rec.berth_end);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        issues.push({
          row: i + 1,
          field: 'berth_end',
          severity: 'error',
          message: '靠泊结束时间早于开始时间',
          suggestion: '请检查时间字段是否颠倒，确认靠泊开始/结束时间顺序',
        });
      }
    }

    if (!rec.notice_time && !rec.berth_start) {
      issues.push({
        row: i + 1,
        field: 'notice_time',
        severity: 'warning',
        message: '无 NOR 通知时间也无靠泊开始时间',
        suggestion: '免费期起算点无法确定，请补充 NOR 通知时间(Notice of Readiness)',
      });
    }
  }

  return issues;
}
