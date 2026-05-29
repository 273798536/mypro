import type { ValidationIssue } from '@shared/types.js';
import type { HandlingRow } from '../db/types.js';

const REQUIRED_FIELDS: (keyof HandlingRow)[] = ['berth_id'];

export function validateHandling(records: HandlingRow[]): ValidationIssue[] {
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
          suggestion: '装卸记录必须关联到靠泊记录，请补充 berth_id 或先导入靠泊记录后重新上传',
        });
      }
    }

    if (!rec.handling_start) {
      issues.push({
        row: i + 1,
        field: 'handling_start',
        severity: 'warning',
        message: '装卸开始时间缺失',
        suggestion: '缺少装卸开始时间将影响免费期判定，请补充或系统将默认使用靠泊开始时间',
      });
    }

    if (!rec.handling_end) {
      issues.push({
        row: i + 1,
        field: 'handling_end',
        severity: 'warning',
        message: '装卸结束时间缺失',
        suggestion: '缺少装卸结束时间将无法确定装卸完成时刻，免费期截止点将使用靠泊结束时间替代',
      });
    }

    if (rec.handling_start && rec.handling_end) {
      const start = new Date(rec.handling_start);
      const end = new Date(rec.handling_end);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        issues.push({
          row: i + 1,
          field: 'handling_end',
          severity: 'error',
          message: '装卸结束时间早于开始时间',
          suggestion: '请检查装卸时间是否颠倒',
        });
      }
    }

    if (rec.pause_hours && rec.pause_hours > 0 && !rec.pause_reason) {
      issues.push({
        row: i + 1,
        field: 'pause_reason',
        severity: 'warning',
        message: '存在装卸暂停但未填写原因',
        suggestion: '装卸暂停需要结算员复核确认是否计入滞期，请补充暂停原因',
      });
    }
  }

  return issues;
}
