import { DiffItem } from '../types';

export function deepDiff<T extends Record<string, any>>(
  obj1: Partial<T>,
  obj2: Partial<T>
): DiffItem[] {
  const diffs: DiffItem[] = [];
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  allKeys.forEach((key) => {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];

    if (val1 === undefined && val2 !== undefined) {
      diffs.push({ field: key, before: undefined, after: val2, type: 'added' });
    } else if (val1 !== undefined && val2 === undefined) {
      diffs.push({ field: key, before: val1, after: undefined, type: 'removed' });
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({ field: key, before: val1, after: val2, type: 'modified' });
    }
  });

  return diffs;
}

export function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    caseNo: '赔案编号',
    accidentDate: '出险日期',
    insured: '被保险人',
    riskType: '险别',
    totalLoss: '赔款金额',
    status: '状态',
    remark: '备注',
    contractNo: '合同编号',
    version: '版本',
    reinsurer: '再保险人',
    effectiveDate: '生效日期',
    expiryDate: '到期日期',
    shareRate: '分保比例',
    deductible: '免赔额',
    layerType: '分保方式',
    isActive: '是否有效',
    recoverableAmount: '应摊回金额',
    actualRecovery: '实际摊回金额',
    deductibleApplied: '实际免赔额',
    hasDeductibleError: '免赔错用',
  };
  return fieldMap[field] || field;
}

export function formatValue(value: any): string {
  if (value === undefined || value === null) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') {
    if (value < 1 && value > 0) return `${(value * 100).toFixed(0)}%`;
    return value.toLocaleString();
  }
  if (value === 'quota') return '成数分保';
  if (value === 'excess') return '溢额分保';
  if (value === 'pending') return '待处理';
  if (value === 'confirmed') return '已确认';
  if (value === 'closed') return '已结案';
  return String(value);
}

export function generateDiffDescription(diffs: DiffItem[]): string {
  if (diffs.length === 0) return '无差异';

  const descriptions = diffs.map((diff) => {
    const fieldName = formatFieldName(diff.field);
    const before = formatValue(diff.before);
    const after = formatValue(diff.after);

    if (diff.type === 'added') {
      return `新增 ${fieldName}：${after}`;
    } else if (diff.type === 'removed') {
      return `删除 ${fieldName}：${before}`;
    } else {
      return `${fieldName}：${before} → ${after}`;
    }
  });

  return descriptions.join('；');
}
