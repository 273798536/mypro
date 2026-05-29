import type { ValidationIssue } from '@shared/types.js';
import type { ContractRow } from '../db/types.js';

const REQUIRED_FIELDS: (keyof ContractRow)[] = ['vessel_name', 'port'];

export function validateContract(records: ContractRow[]): ValidationIssue[] {
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
          suggestion: `合同费率必须关联船名和港口，请补充 ${field}`,
        });
      }
    }

    if (rec.rate_tier1 == null && rec.rate_tier2 == null && rec.rate_tier3 == null) {
      issues.push({
        row: i + 1,
        field: 'rate_tier1',
        severity: 'error',
        message: '合同费率全部缺失',
        suggestion: '合同费率缺失时将无法计算滞期费。请补充至少一档费率，或系统将使用默认费率 0 并标记需复核',
      });
    }

    if (rec.rate_tier1 == null) {
      issues.push({
        row: i + 1,
        field: 'rate_tier1',
        severity: 'warning',
        message: '第一档费率缺失',
        suggestion: '缺少第一档费率将跳过对应时段计费。请补充费率或系统将以 0 计费并标记"费率缺失"需复核',
      });
    }

    if (rec.free_hours == null) {
      issues.push({
        row: i + 1,
        field: 'free_hours',
        severity: 'warning',
        message: '免费期时长缺失',
        suggestion: '缺少免费期时长将默认使用 0 小时免费期（即全部时间计费）。请补充合同约定的免费期小时数',
      });
    }

    if (!rec.valid_from || !rec.valid_to) {
      issues.push({
        row: i + 1,
        field: 'valid_from',
        severity: 'warning',
        message: '合同有效期不完整',
        suggestion: '缺少有效期将默认该费率长期有效，请补充合同起止日期以避免误用过期费率',
      });
    }
  }

  return issues;
}
